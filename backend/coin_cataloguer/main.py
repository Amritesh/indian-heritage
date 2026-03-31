"""
CLI entry point for the Coin Cataloguer CrewAI application.

Usage:
    python -m coin_cataloguer.main --image /path/to/coins.jpg
    python -m coin_cataloguer.main --image /path/to/coins.jpg --output ./my_output --upload
    python -m coin_cataloguer.main --image /path/to/coins.jpg --collection "mughal-coins"
"""

import argparse
import json
import os
import re
import sys

from dotenv import load_dotenv


STORAGE_BUCKET = "indian-heritage-gallery-bucket"
DATABASE_URL = "https://indian-heritage-gallery-default-rtdb.firebaseio.com/"


def _project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _titleize_collection_name(collection_name):
    return collection_name.replace("-", " ").replace("_", " ").title()


def _slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")


def _temp_data_file(collection_name):
    return os.path.join(_project_root(), "temp", "data", f"{collection_name}.json")


def _read_json_file(path):
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _write_json_file(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _load_collection_meta_seed(collection_name):
    collections_path = os.path.join(_project_root(), "temp", "data", "collections.json")
    collections_data = _read_json_file(collections_path) or {}
    entries = collections_data.get("collections", collections_data)
    if isinstance(entries, list):
        for entry in entries:
            if isinstance(entry, dict) and entry.get("id") == collection_name:
                return entry
    elif isinstance(entries, dict):
        direct = entries.get(collection_name)
        if isinstance(direct, dict):
            return direct
        for entry in entries.values():
            if isinstance(entry, dict) and entry.get("id") == collection_name:
                return entry
    return {}


def _load_local_collection_detail(collection_name):
    data = _read_json_file(_temp_data_file(collection_name))
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return data
    return None


def _normalize_existing_item(item):
    if not isinstance(item, dict):
        return None

    metadata = item.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {
            "type": "coin",
            "ruler_or_issuer": item.get("ruler_or_issuer", ""),
            "year_or_period": item.get("year_or_period", item.get("period", "")),
            "mint_or_place": item.get("mint_or_place", item.get("mint", item.get("region", ""))),
            "denomination": item.get("denomination", ""),
            "series_or_catalog": item.get("series_or_catalog", ""),
            "material": item.get("material", ""),
            "condition": item.get("condition", ""),
            "weight_estimate": item.get("weight_estimate", ""),
            "estimated_price_inr": item.get("estimated_price_inr", ""),
            "confidence": item.get("confidence", ""),
        }

    materials = item.get("materials")
    material = metadata.get("material") or item.get("material") or ""
    if not isinstance(materials, list) or not materials:
        materials = [material] if material else ["Unknown"]

    notes = item.get("notes")
    if isinstance(notes, str):
        notes = [notes]
    if not isinstance(notes, list) or not notes:
        notes = ["Auto-catalogued coin"]

    return {
        "id": item.get("id") or "",
        "page": item.get("page"),
        "title": item.get("title") or "Untitled Coin",
        "period": item.get("period") or metadata.get("year_or_period") or None,
        "region": item.get("region") or metadata.get("mint_or_place") or None,
        "materials": materials,
        "image": item.get("image", ""),
        "notes": notes,
        "display_labels": item.get("display_labels", []),
        "description": item.get("description", ""),
        "metadata": metadata,
    }


def _item_dedupe_key(item):
    metadata = item.get("metadata") or {}
    image = str(item.get("image", "") or "")
    image_key = image.lower()
    if image_key.startswith("gs://"):
        image_key = image_key.split("?", 1)[0]
    elif image_key:
        image_key = os.path.basename(image_key)

    fallback_parts = [
        item.get("title", ""),
        metadata.get("ruler_or_issuer", ""),
        metadata.get("denomination", ""),
        metadata.get("year_or_period", ""),
        metadata.get("mint_or_place", ""),
    ]
    fallback_key = "|".join(_slugify(part) for part in fallback_parts if part)
    return image_key or fallback_key or _slugify(item.get("id", ""))


def _ensure_unique_item_id(collection_name, item, used_ids, sequence_start):
    current_id = str(item.get("id", "") or "").strip()
    if current_id and current_id not in used_ids and not current_id.startswith("page-"):
        used_ids.add(current_id)
        return current_id, sequence_start

    next_sequence = sequence_start
    while True:
        # Check for 'coin-X' pattern which is used in existing mughals collection
        candidate = f"coin-{next_sequence}"
        if candidate not in used_ids:
            used_ids.add(candidate)
            return candidate, next_sequence + 1
        
        # Fallback to collection-item-X if coin-X is taken
        candidate = f"{collection_name}-item-{next_sequence}"
        if candidate not in used_ids:
            used_ids.add(candidate)
            return candidate, next_sequence + 1
        
        next_sequence += 1


def _upsert_collection_meta(database, collection_meta):
    collections_ref = database.child("collections")
    current = collections_ref.get()

    if isinstance(current, list):
        updated = []
        seen = False
        for entry in current:
            if not isinstance(entry, dict):
                updated.append(entry)
                continue
            if entry.get("id") == collection_meta["id"]:
                if not seen:
                    updated.append(collection_meta)
                    seen = True
                continue
            updated.append(entry)
        if not seen:
            updated.append(collection_meta)
        collections_ref.set(updated)
    else:
        collections_ref.child(collection_meta["id"]).set(collection_meta)


def _init_firebase():
    """Initialize Firebase if needed, return (bucket, db_ref)."""
    import firebase_admin
    from firebase_admin import credentials, db, storage

    if not firebase_admin._apps:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        key_path = os.path.join(
            project_root,
            "indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json",
        )
        env_key = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY", "")
        cred_path = env_key if env_key and os.path.isfile(env_key) else key_path

        if not os.path.isfile(cred_path):
            print(f"Error: Firebase service account key not found at {cred_path}")
            return None, None

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(
            cred,
            {
                "databaseURL": DATABASE_URL,
                "storageBucket": STORAGE_BUCKET,
            },
        )

    return storage.bucket(), db.reference()


def upload_to_firebase(catalogue, collection_name, source_page_path="", clear_collection=False):
    """Upload catalogue data and images to Firebase matching the frontend's expected format.

    Frontend expects:
      collections/{id}           -> { id, title, category, image (gs://), ... }
      collection_details/{id}    -> { album_title, items: [{ id, page, title, image (gs://),
                                     period, region, materials[], notes[], display_labels[],
                                     description, metadata{} }, ...] }
    """
    bucket, database = _init_firebase()
    if not bucket:
        return None

    collection_id = collection_name
    
    if clear_collection:
        print(f"  CLEARING collection: {collection_id}")
        existing_detail = {
            "album_title": _titleize_collection_name(collection_name),
            "items": [],
        }
    else:
        existing_detail = _load_local_collection_detail(collection_name)
        if not existing_detail:
            remote_detail = database.child("collection_details").child(collection_id).get()
            if isinstance(remote_detail, dict) and isinstance(remote_detail.get("items"), list):
                existing_detail = remote_detail
            else:
                existing_detail = {
                    "album_title": _titleize_collection_name(collection_name),
                    "items": [],
                }

    existing_items = []
    for existing_item in existing_detail.get("items", []):
        normalized = _normalize_existing_item(existing_item)
        if normalized:
            existing_items.append(normalized)

    used_ids = {item["id"] for item in existing_items if item.get("id")}
    sequence = len(used_ids) + 1
    merged_by_key = {_item_dedupe_key(item): item for item in existing_items}

    page_stem = os.path.splitext(os.path.basename(source_page_path or ""))[0]
    page_label = page_stem or "upload"

    for idx, coin in enumerate(catalogue, 1):
        image_path = coin.get("image_path", "")
        gs_url = ""

        # Upload image to Firebase Storage
        if image_path and os.path.isfile(image_path):
            blob_basename = os.path.basename(image_path)
            blob_path = (
                f"images/{collection_id}/{page_label}/{blob_basename}"
                if page_stem
                else f"images/{collection_id}/{blob_basename}"
            )
            blob = bucket.blob(blob_path)
            blob.upload_from_filename(image_path, content_type="image/png")
            # Store as gs:// URL - the frontend converts this to HTTP via getFirebaseStorageUrl()
            gs_url = f"gs://{STORAGE_BUCKET}/{blob_path}"
            print(f"  Uploaded: {os.path.basename(image_path)} -> {gs_url}")

        ruler = coin.get("ruler_or_issuer", "Unknown")
        denomination = coin.get("denomination", "Unknown")
        year = coin.get("year_or_period", "")
        mint = coin.get("mint_or_place", "")
        material = coin.get("material", "")
        condition = coin.get("condition", "")
        weight = coin.get("weight_estimate", "")
        price = coin.get("estimated_price_inr", "")
        catalog_ref = coin.get("series_or_catalog", "")

        # Build display_labels for the orange tags shown on ItemCard
        display_labels = []
        if weight:
            display_labels.append(f"Wt: {weight}")
        if condition:
            display_labels.append(condition)
        if price:
            display_labels.append(f"₹{price}")

        # Build notes array
        notes = []
        obverse = coin.get("obverse_description", "")
        reverse = coin.get("reverse_description", "")
        if obverse:
            notes.append(f"Obverse: {obverse}")
        if reverse:
            notes.append(f"Reverse: {reverse}")
        extra_notes = coin.get("notes", "")
        if extra_notes:
            notes.append(extra_notes)

        # Build description
        parts = [f"{denomination} issued by {ruler}"]
        if year:
            parts.append(f"Period: {year}")
        if mint:
            parts.append(f"Mint: {mint}")
        if catalog_ref:
            parts.append(f"Catalog: {catalog_ref}")
        description = ". ".join(parts) + "."

        # Item structure matching what the frontend renders
        item = {
            "id": "",
            "page": idx,
            "title": f"{denomination} - {ruler}",
            "period": year or None,
            "region": mint or None,
            "materials": [material] if material else ["Unknown"],
            "image": gs_url or image_path,
            "notes": notes if notes else ["Auto-catalogued coin"],
            "display_labels": display_labels,
            "description": description,
            "metadata": {
                "type": "coin",
                "ruler_or_issuer": ruler,
                "year_or_period": year,
                "mint_or_place": mint,
                "denomination": denomination,
                "series_or_catalog": catalog_ref,
                "material": material,
                "condition": condition,
                "weight_estimate": weight,
                "estimated_price_inr": price,
                "confidence": coin.get("confidence", ""),
            },
        }
        item["id"], sequence = _ensure_unique_item_id(collection_name, item, used_ids, sequence)
        merged_by_key[_item_dedupe_key(item)] = item

    items = list(merged_by_key.values())

    for idx, item in enumerate(items, 1):
        if item.get("page") in (None, "", 0):
            item["page"] = idx

    first_gs_url = next((item.get("image", "") for item in items if str(item.get("image", "")).startswith("gs://")), "")

    # collection_details/{id} -> { album_title, items: [...] }
    collection_detail = {
        "album_title": existing_detail.get("album_title") or _titleize_collection_name(collection_name),
        "items": items,
    }

    # collections/{id} -> top-level listing entry
    meta_seed = _load_collection_meta_seed(collection_name)
    collection_meta = {
        "id": collection_id,
        "title": meta_seed.get("title") or _titleize_collection_name(collection_name),
        "category": meta_seed.get("category") or "Numismatics",
        "assetValue": meta_seed.get("assetValue") or str(len(items)),
        "volume": meta_seed.get("volume") or "1",
        "era": meta_seed.get("era") or "",
        "description": meta_seed.get("description") or f"Auto-catalogued coin collection ({len(items)} coins)",
        "time": meta_seed.get("time"),
        "pages": str(len(items)),
        "image": meta_seed.get("image") or first_gs_url,
        "items": [],
    }

    _upsert_collection_meta(database, collection_meta)
    database.child("collection_details").child(collection_id).set(collection_detail)
    _write_json_file(_temp_data_file(collection_name), collection_detail)

    return {
        "collection_id": collection_id,
        "items_uploaded": len(catalogue),
        "items_total": len(items),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Coin Cataloguer - Segment and identify coins from an image using AI agents"
    )
    parser.add_argument(
        "--image",
        required=True,
        help="Path to the input image containing multiple coins",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Output directory for cropped coin images (default: <image_dir>/coins_output)",
    )
    parser.add_argument(
        "--collection",
        default="coin-catalogue",
        help="Collection name for Firebase upload (default: coin-catalogue)",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload catalogue and images to Firebase after processing",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing collection items before uploading (use with --upload)",
    )
    args = parser.parse_args()

    # Load environment variables from backend/.env
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(env_path)

    # Validate API keys
    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY not set. Add it to backend/.env")
        sys.exit(1)

    if not os.environ.get("SERPER_API_KEY"):
        print("Warning: SERPER_API_KEY not set. Web search will not work.")
        print("Add SERPER_API_KEY to backend/.env for full functionality.")
        print("Get a free key at https://serper.dev\n")

    # Validate image path
    image_path = os.path.abspath(args.image)
    if not os.path.isfile(image_path):
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)

    output_dir = os.path.abspath(args.output) if args.output else ""

    print("=" * 60)
    print("  COIN CATALOGUER - CrewAI Agents")
    print("=" * 60)
    print(f"  Image:      {image_path}")
    print(f"  Output:     {output_dir or 'auto (next to image)'}")
    print(f"  Collection: {args.collection}")
    print(f"  Upload:     {'Yes' if args.upload else 'No'}")
    print("=" * 60)
    print()

    # Import crew here (after env is loaded) so Gemini client picks up the key
    from .crew import create_crew

    crew = create_crew(
        image_path=image_path,
        output_dir=output_dir,
        collection_name=args.collection,
    )

    result = crew.kickoff()

    # Save catalogue JSON locally
    save_dir = output_dir or os.path.join(os.path.dirname(image_path), "coins_output")
    os.makedirs(save_dir, exist_ok=True)
    catalogue_path = os.path.join(save_dir, "catalogue.json")

    # Try to parse the final result as JSON for clean saving
    catalogue_data = None
    try:
        catalogue_data = json.loads(str(result))
        with open(catalogue_path, "w") as f:
            json.dump(catalogue_data, f, indent=2, ensure_ascii=False)
    except (json.JSONDecodeError, TypeError):
        with open(catalogue_path, "w") as f:
            f.write(str(result))

    print()
    print(f"  Catalogue saved to: {catalogue_path}")

    # --- Firebase upload (deterministic, not agent-driven) ---
    if args.upload:
        print()
        print("  Uploading to Firebase...")

        # Parse catalogue - handle both list and dict formats
        coins = []
        if isinstance(catalogue_data, list):
            coins = catalogue_data
        elif isinstance(catalogue_data, dict) and "catalogue" in catalogue_data:
            coins = catalogue_data["catalogue"]
        elif isinstance(catalogue_data, dict):
            coins = [catalogue_data]

        if not coins:
            print("  Warning: Could not parse catalogue for upload.")
        else:
            upload_result = upload_to_firebase(
                coins, args.collection, source_page_path=image_path, clear_collection=args.clear
            )
            if upload_result:
                print(f"  Collection ID: {upload_result['collection_id']}")
                print(f"  Items uploaded: {upload_result['items_uploaded']}")
                print(f"  Collection total: {upload_result['items_total']}")
                print(f"  DB path: collections/{upload_result['collection_id']}")
            else:
                print("  Upload failed. Check Firebase credentials.")

    print()
    print("=" * 60)
    print("  DONE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
