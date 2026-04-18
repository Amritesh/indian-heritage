import argparse
import json
import os
import sys
from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from coin_cataloguer.price_validation import (
    assess_price_validation,
    fetch_bullion_rates,
    research_validated_price,
    search_market_context,
    should_research_item,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "temp" / "data"
PROGRESS_PATH = PROJECT_ROOT / "temp" / "output" / "manual-price-revalidation-progress.json"
DEFAULT_COLLECTIONS = ["british", "mughals", "princely-states", "sultanate"]


def parse_args():
    parser = argparse.ArgumentParser(description="Manual price revalidation for catalog collections")
    parser.add_argument("--collections", nargs="*", default=DEFAULT_COLLECTIONS)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-research", type=int, default=40)
    return parser.parse_args()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_progress(progress):
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS_PATH.write_text(json.dumps(progress, indent=2, ensure_ascii=False))


def find_data_path(slug: str) -> Path:
    return DATA_DIR / f"{slug}.json"


def format_price_text(min_value: int, max_value: int) -> str:
    if min_value <= 0 and max_value <= 0:
        return ""
    if min_value == max_value:
        return f"{min_value:,}"
    return f"{min_value:,} - {max_value:,}"


def build_query(item):
    metadata = item.get("metadata", {})
    return " ".join(
        part
        for part in [
            item.get("title"),
            metadata.get("ruler_or_issuer") or metadata.get("rulerOrIssuer"),
            metadata.get("denomination"),
            metadata.get("mint_or_place") or metadata.get("mintOrPlace"),
            item.get("period"),
            "coin price",
        ]
        if part
    )


def apply_validation(item, assessment, rates, researched):
    metadata = item.setdefault("metadata", {})
    original_price = metadata.get("estimated_price_inr") or metadata.get("estimatedPriceInr") or ""
    if researched:
        min_value = int(researched.get("validated_price_min") or 0)
        max_value = int(researched.get("validated_price_max") or 0)
        if assessment["metal_value_inr"] > 0:
            min_value = max(min_value, assessment["metal_value_inr"])
            max_value = max(max_value, min_value)
        validated_text = researched.get("validated_price_text") or format_price_text(min_value, max_value)
        researched["validated_price_min"] = min_value
        researched["validated_price_max"] = max_value
        researched["validated_price_text"] = validated_text
    elif assessment["status"] == "below_metal_floor" and assessment["metal_value_inr"] > 0:
        floor_min = assessment["metal_value_inr"]
        floor_max = int(floor_min * 1.2)
        validated_text = format_price_text(floor_min, floor_max)
        researched = {
            "validated_price_min": floor_min,
            "validated_price_max": floor_max,
            "validated_price_text": validated_text,
            "confidence": "low",
            "manual_review_required": True,
            "reasoning": "Auto-adjusted to stay above the live bullion floor pending a fuller market review.",
            "search_results": [],
        }
    elif researched and researched.get("validated_price_text"):
        validated_text = researched["validated_price_text"]
    else:
        validated_text = original_price

    if original_price and original_price != validated_text and "original_estimated_price_inr" not in metadata:
        metadata["original_estimated_price_inr"] = original_price

    metadata["estimated_price_inr"] = validated_text
    metadata["price_validation_status"] = (
        "researched" if researched else assessment["status"]
    )
    metadata["price_validation_flags"] = assessment["flags"]
    metadata["price_validation_updated_at"] = now_iso()
    metadata["intrinsic_metal_value_inr"] = assessment["metal_value_inr"]
    metadata["bullion_reference"] = {
        "as_of": rates["as_of"],
        "gold_24k_inr_per_gram": rates["gold_24k_inr_per_gram"],
        "silver_999_inr_per_gram": rates["silver_999_inr_per_gram"],
    }
    if researched:
        metadata["price_validation_notes"] = researched.get("reasoning", "")
        metadata["price_validation_sources"] = [
            result["url"] for result in researched.get("search_results", [])
        ]
        metadata["price_validation_confidence"] = researched.get("confidence", "low")
        metadata["price_validation_manual_review_required"] = researched.get("manual_review_required", False)

    return item


def main():
    args = parse_args()
    load_dotenv(PROJECT_ROOT / "backend" / ".env")

    rates = fetch_bullion_rates()
    progress = {
        "started_at": now_iso(),
        "updated_at": now_iso(),
        "rates": rates,
        "collections": {},
        "totals": {
            "processed": 0,
            "updated": 0,
            "flagged": 0,
            "researched": 0,
        },
        "current": None,
    }
    write_progress(progress)

    researched_count = 0

    for slug in args.collections:
        data_path = find_data_path(slug)
        if not data_path.exists():
            continue

        payload = json.loads(data_path.read_text(encoding="utf-8"))
        items = payload.get("items", [])
        collection_stats = defaultdict(int)
        progress["collections"][slug] = {
            "total": len(items),
            "processed": 0,
            "updated": 0,
            "flagged": 0,
            "researched": 0,
        }

        updated_items = []
        for index, item in enumerate(items, start=1):
            metadata = item.get("metadata", {})
            assessment = assess_price_validation(
                materials=item.get("materials") or [],
                weight_text=metadata.get("weight_estimate") or metadata.get("weightEstimate"),
                estimated_price_text=metadata.get("estimated_price_inr") or metadata.get("estimatedPriceInr"),
                gold_24k_inr_per_gram=rates["gold_24k_inr_per_gram"],
                silver_999_inr_per_gram=rates["silver_999_inr_per_gram"],
            )

            researched = None
            if should_research_item(item=item, assessment=assessment) and researched_count < args.max_research:
                try:
                    query = build_query(item)
                    search_results = search_market_context(query)
                    researched = research_validated_price(
                        item=item,
                        rates=rates,
                        assessment=assessment,
                        search_results=search_results,
                    )
                    if researched:
                        researched["search_results"] = search_results
                        researched_count += 1
                        collection_stats["researched"] += 1
                except Exception as exc:
                    assessment["flags"] = [*assessment["flags"], "research_error"]
                    metadata = item.setdefault("metadata", {})
                    metadata["price_validation_notes"] = f"Research error: {exc}"

            updated_item = apply_validation(deepcopy(item), assessment, rates, researched)
            updated_items.append(updated_item)

            if assessment["flags"]:
                collection_stats["flagged"] += 1
            collection_stats["processed"] += 1
            collection_stats["updated"] += 1

            progress["collections"][slug].update(collection_stats)
            progress["totals"]["processed"] += 1
            progress["totals"]["updated"] += 1
            if assessment["flags"]:
                progress["totals"]["flagged"] += 1
            if researched:
                progress["totals"]["researched"] += 1

            progress["current"] = {
                "collection": slug,
                "index": index,
                "total": len(items),
                "item_id": item.get("id"),
                "title": item.get("title"),
            }
            progress["updated_at"] = now_iso()
            write_progress(progress)
            if index == 1 or index % 25 == 0 or index == len(items):
                print(
                    f"[{slug}] {index}/{len(items)} "
                    f"flagged={collection_stats['flagged']} researched={collection_stats['researched']}"
                )

        if not args.dry_run:
            payload["items"] = updated_items
            data_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    progress["completed_at"] = now_iso()
    progress["current"] = None
    write_progress(progress)
    print(json.dumps(progress["totals"], indent=2))


if __name__ == "__main__":
    main()
