import json
from pathlib import Path

from .main import upload_to_firebase
from .tools.coin_analyzer import analyze_coin


def analyze_coin_image(image_path: Path):
    return json.loads(analyze_coin.func(str(image_path)))


def resolve_local_image_path(item, output_root: Path) -> Path:
    metadata = item.get("metadata") or {}
    source_batch = str(metadata.get("source_batch") or "").strip()
    source_page = str(metadata.get("source_page_path") or "").strip()
    image_name = Path(str(item.get("image") or "")).name

    if not source_batch or not source_page or not image_name:
        raise ValueError("Item is missing source_batch, source_page_path, or image filename.")

    page_number = int(source_page.replace("page-", ""))
    return output_root / source_batch / f"page-{page_number:02d}" / image_name


def resolve_source_page_image_path(payload, images_root: Path) -> Path:
    source_batch = str(payload.get("source_batch") or "").strip()
    source_page = str(payload.get("source_page_path") or "").strip()
    if not source_batch or not source_page:
        raise ValueError("Payload is missing source_batch or source_page_path.")
    return images_root / source_batch / f"{source_page}.png"


def build_coin_payload(*, item, analysis, image_path: Path):
    metadata = item.get("metadata") or {}
    payload = {
        "image_path": str(image_path),
        "ruler_or_issuer": analysis.get("ruler_or_issuer", ""),
        "year_or_period": analysis.get("year_or_period", ""),
        "mint_or_place": analysis.get("mint_or_place", ""),
        "denomination": analysis.get("denomination", ""),
        "series_or_catalog": analysis.get("series_or_catalog", ""),
        "material": analysis.get("material", ""),
        "condition": analysis.get("condition", ""),
        "obverse_description": analysis.get("obverse_description", ""),
        "reverse_description": analysis.get("reverse_description", ""),
        "weight_estimate": analysis.get("weight_estimate", ""),
        "estimated_price_inr": analysis.get("estimated_price_inr", ""),
        "notes": analysis.get("notes", ""),
        "confidence": analysis.get("confidence", ""),
        "source_batch": metadata.get("source_batch", ""),
        "source_page_path": metadata.get("source_page_path", ""),
    }
    return payload


def load_collection_detail(collection_path: Path):
    return json.loads(collection_path.read_text(encoding="utf-8"))


def analyze_collection_items(*, collection_data, output_root: Path):
    enriched = []
    for item in collection_data.get("items", []):
        local_image_path = resolve_local_image_path(item, output_root)
        analysis = analyze_coin_image(local_image_path)
        enriched.append(
            build_coin_payload(item=item, analysis=analysis, image_path=local_image_path)
        )
    return enriched


def upload_enriched_collection(*, collection_name: str, enriched_items, images_root: Path, clear_collection: bool = True):
    """Write enriched items through the legacy Firebase-compatible upload bridge.

    Supabase is the archive metadata source of truth; Firebase Storage remains
    the media transport and this helper exists for transitional compatibility
    with existing page/image enrichment workflows.
    """
    grouped = {}
    for coin in enriched_items:
        grouped.setdefault((coin.get("source_batch", ""), coin.get("source_page_path", "")), []).append(coin)

    first_upload = clear_collection
    for _, coins in grouped.items():
        source_page_image_path = resolve_source_page_image_path(coins[0], images_root)
        upload_to_firebase(
            coins,
            collection_name,
            source_page_path=str(source_page_image_path),
            clear_collection=first_upload,
        )
        first_upload = False
