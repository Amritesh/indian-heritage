"""
Legacy CrewAI tool that uploads coin catalogue data and images to Firebase.

AHG now treats Supabase as the source of truth for metadata/search and keeps
Firebase primarily for media storage plus transitional compatibility payloads.
This bridge should be treated as media-centric, not as the canonical archive
writer.
"""

import json
import os
import uuid
from datetime import datetime, timezone

import firebase_admin
from ._tool_compat import tool
from firebase_admin import credentials, db, storage


def _get_firebase_app():
    """Initialize Firebase app if not already done."""
    if firebase_admin._apps:
        return firebase_admin.get_app()

    # Look for service account key in standard locations
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    key_patterns = [
        os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY", ""),
        os.path.join(project_root, "indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json"),
    ]

    cred_path = None
    for p in key_patterns:
        if p and os.path.isfile(p):
            cred_path = p
            break

    if not cred_path:
        raise FileNotFoundError(
            "Firebase service account key not found. Set FIREBASE_SERVICE_ACCOUNT_KEY env var "
            "or place the key file in the project root."
        )

    cred = credentials.Certificate(cred_path)
    return firebase_admin.initialize_app(
        cred,
        {
            "databaseURL": "https://indian-heritage-gallery-default-rtdb.firebaseio.com/",
            "storageBucket": "indian-heritage-gallery-bucket",
        },
    )


# Module-level default, set by create_tool()
_default_collection_name = "coin-catalogue"


def create_tool(collection_name: str = "coin-catalogue"):
    """Create the upload_to_firebase tool with the given collection name."""
    global _default_collection_name
    _default_collection_name = collection_name
    return upload_to_firebase


@tool("upload_to_firebase")
def upload_to_firebase(catalogue_json: str) -> str:
    """Uploads a coin catalogue JSON string into the legacy Firebase-compatible bridge.

    Images go to Firebase Storage. Metadata is written only for transitional
    compatibility with older flows; the canonical archive metadata source of
    truth is now Supabase.
    """
    try:
        data = json.loads(catalogue_json)
    except json.JSONDecodeError:
        return "Error: Invalid JSON input. Expected a JSON string with 'catalogue' and 'collection_name' fields."

    catalogue = data.get("catalogue", [])
    col_name = data.get("collection_name", _default_collection_name)

    if not catalogue:
        return "Error: No coins in catalogue to upload."

    _get_firebase_app()

    bucket = storage.bucket()
    database = db.reference()

    collection_id = f"{col_name}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    uploaded_items = []

    for coin in catalogue:
        coin_id = str(uuid.uuid4())[:8]
        image_path = coin.get("image_path", "")

        # Upload image to Firebase Storage
        image_url = ""
        if image_path and os.path.isfile(image_path):
            blob_path = f"images/{collection_id}/{os.path.basename(image_path)}"
            blob = bucket.blob(blob_path)
            blob.upload_from_filename(image_path, content_type="image/png")
            blob.make_public()
            image_url = blob.public_url

        # Build item record
        item = {
            "id": coin_id,
            "title": f"{coin.get('denomination', 'Unknown')} - {coin.get('ruler_or_issuer', 'Unknown')}",
            "ruler_or_issuer": coin.get("ruler_or_issuer", ""),
            "year_or_period": coin.get("year_or_period", ""),
            "mint_or_place": coin.get("mint_or_place", ""),
            "denomination": coin.get("denomination", ""),
            "series_or_catalog": coin.get("series_or_catalog", ""),
            "material": coin.get("material", ""),
            "condition": coin.get("condition", ""),
            "obverse_description": coin.get("obverse_description", ""),
            "reverse_description": coin.get("reverse_description", ""),
            "weight_estimate": coin.get("weight_estimate", ""),
            "estimated_price_inr": coin.get("estimated_price_inr", ""),
            "notes": coin.get("notes", ""),
            "confidence": coin.get("confidence", ""),
            "image": image_url or coin.get("image_path", ""),
        }
        uploaded_items.append(item)

    # Save collection metadata
    collection_meta = {
        "id": collection_id,
        "title": col_name.replace("-", " ").title(),
        "category": "Numismatics",
        "description": f"Auto-catalogued coin collection ({len(uploaded_items)} coins)",
        "pages": "1",
        "volume": "1",
        "era": "",
        "assetValue": str(len(uploaded_items)),
        "image": uploaded_items[0]["image"] if uploaded_items else "",
    }

    database.child("collections").child(collection_id).set(collection_meta)
    database.child("collection_details").child(collection_id).set(uploaded_items)

    result = {
        "status": "success",
        "collection_id": collection_id,
        "items_uploaded": len(uploaded_items),
        "firebase_db_path": f"collections/{collection_id}",
        "items_db_path": f"collection_details/{collection_id}",
    }
    return json.dumps(result, indent=2)
