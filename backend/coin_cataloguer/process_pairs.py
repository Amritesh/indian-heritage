"""
Process paired obverse/reverse album pages into item-wise coin entries.

Usage:
    python -m coin_cataloguer.process_pairs \
      --collection british \
      --base-dir /path/to/pages \
      --pairs "10:11,12:13"
"""

import argparse
import json
import os
from typing import List, Tuple

from dotenv import load_dotenv
from PIL import Image

from .main import upload_to_firebase
from .tools.coin_analyzer import analyze_coin_image
from .tools.image_segmenter import create_tool as create_segment_tool


def _parse_pairs(raw_pairs: str) -> List[Tuple[int, int | None]]:
    pairs = []
    for chunk in [part.strip() for part in raw_pairs.split(",") if part.strip()]:
        if ":" not in chunk:
            pairs.append((int(chunk), None))
            continue
        left, right = chunk.split(":", 1)
        pairs.append((int(left), int(right)))
    return pairs


def _pair_output_dir(base_dir: str, front_page: int, back_page: int | None) -> str:
    if back_page is None:
        return os.path.join(base_dir, "paired_output", f"page-{front_page}")
    return os.path.join(base_dir, "paired_output", f"page-{front_page:02d}-{back_page:02d}")


def _load_segmented_page(image_path: str, output_dir: str):
    segment_tool = create_segment_tool(output_dir=output_dir)
    raw = segment_tool.run(image_path)
    data = json.loads(raw)
    return data.get("coins", [])


def _group_into_rows(coins, y_threshold=50):
    """Group coins into rows based on Y-coordinate center."""
    if not coins:
        return []
    
    # Sort by Y center
    sorted_coins = sorted(coins, key=lambda c: c["bbox"]["y"] + c["bbox"]["height"] / 2)
    rows = []
    
    if not sorted_coins:
        return rows
    
    current_row = [sorted_coins[0]]
    for i in range(1, len(sorted_coins)):
        prev_coin = current_row[-1]
        curr_coin = sorted_coins[i]
        prev_center_y = prev_coin["bbox"]["y"] + prev_coin["bbox"]["height"] / 2
        curr_center_y = curr_coin["bbox"]["y"] + curr_coin["bbox"]["height"] / 2
        
        if abs(curr_center_y - prev_center_y) < y_threshold:
            current_row.append(curr_coin)
        else:
            # Sort current row by X before adding
            rows.append(sorted(current_row, key=lambda c: c["bbox"]["x"]))
            current_row = [curr_coin]
    
    rows.append(sorted(current_row, key=lambda c: c["bbox"]["x"]))
    return rows


def _stitch_pair(front_path: str, back_path: str, out_path: str) -> None:
    front = Image.open(front_path).convert("RGBA")
    back = Image.open(back_path).convert("RGBA")

    gap = 48
    width = front.width + back.width + gap
    height = max(front.height, back.height)
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    canvas.paste(front, (0, (height - front.height) // 2))
    canvas.paste(back, (front.width + gap, (height - back.height) // 2))
    canvas.save(out_path, "PNG")


def _analyze_paired_coins(front_page_path: str, back_page_path: str, base_output_dir: str, reverse_back: bool = False):
    front_num = int(os.path.splitext(os.path.basename(front_page_path))[0].split("-")[-1])
    back_num = int(os.path.splitext(os.path.basename(back_page_path))[0].split("-")[-1])
    pair_dir = _pair_output_dir(base_output_dir, front_num, back_num)
    os.makedirs(pair_dir, exist_ok=True)

    front_dir = os.path.join(pair_dir, "front")
    back_dir = os.path.join(pair_dir, "back")
    combined_dir = os.path.join(pair_dir, "combined")
    os.makedirs(combined_dir, exist_ok=True)

    front_coins = _load_segmented_page(front_page_path, front_dir)
    back_coins = _load_segmented_page(back_page_path, back_dir)

    if not front_coins or not back_coins:
        return []

    # Match row-by-row
    front_rows = _group_into_rows(front_coins)
    back_rows = _group_into_rows(back_coins)

    results = []
    global_idx = 1
    
    for row_idx in range(min(len(front_rows), len(back_rows))):
        f_row = front_rows[row_idx]
        b_row = back_rows[row_idx]
        
        # If the back page is turned, it's right-to-left relative to front
        if reverse_back:
            b_row = list(reversed(b_row))
        
        for col_idx in range(min(len(f_row), len(b_row))):
            front_coin = f_row[col_idx]
            back_coin = b_row[col_idx]
            
            combined_path = os.path.join(combined_dir, f"coin_{global_idx}.png")
            _stitch_pair(front_coin["path"], back_coin["path"], combined_path)

            analysis = analyze_coin_image(combined_path, reference_context=_load_reference_context(base_output_dir))
            analysis["source_pages"] = [front_num, back_num]
            analysis["source_images"] = {
                "obverse_page": front_page_path,
                "reverse_page": back_page_path,
                "obverse_crop": front_coin["path"],
                "reverse_crop": back_coin["path"],
            }
            results.append(analysis)
            global_idx += 1

    with open(os.path.join(pair_dir, "catalogue.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    return results


def _analyze_single_page_coins(page_path: str, base_output_dir: str):
    page_num = int(os.path.splitext(os.path.basename(page_path))[0].split("-")[-1])
    pair_dir = _pair_output_dir(base_output_dir, page_num, None)
    os.makedirs(pair_dir, exist_ok=True)

    page_dir = os.path.join(pair_dir, "page")
    coins = _load_segmented_page(page_path, page_dir)
    if not coins:
        return []

    reference_context = _load_reference_context(base_output_dir)
    results = []
    for idx, coin in enumerate(sorted(coins, key=lambda item: item["bbox"]["x"]), start=1):
        analysis = analyze_coin_image(coin["path"], reference_context=reference_context)
        analysis["source_pages"] = [page_num]
        analysis["source_images"] = {
            "page": page_path,
            "crop": coin["path"],
        }
        analysis["pairing_mode"] = "single-page"
        analysis["image_path"] = coin["path"]
        results.append(analysis)

    with open(os.path.join(pair_dir, "catalogue.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    return results


def _load_reference_context(base_dir: str):
    candidates = [
        os.path.join(base_dir, "reference-context.md"),
        os.path.join(base_dir, "reference-context.txt"),
    ]
    for candidate in candidates:
        if os.path.isfile(candidate):
            with open(candidate, "r", encoding="utf-8") as file_obj:
                return file_obj.read().strip()
    return ""


def main():
    parser = argparse.ArgumentParser(description="Process paired obverse/reverse coin pages")
    parser.add_argument("--collection", required=True, help="Collection name for upload")
    parser.add_argument("--base-dir", required=True, help="Directory containing page-XX.png images")
    parser.add_argument("--pairs", required=True, help='Comma-separated list like "10:11,12:13"')
    parser.add_argument("--upload", action="store_true", help="Upload to Firebase after processing")
    parser.add_argument("--clear", action="store_true", help="Clear collection before first upload")
    parser.add_argument("--reverse-back", action="store_true", help="Match back page right-to-left for each row")
    args = parser.parse_args()

    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(env_path)

    if not os.environ.get("GEMINI_API_KEY"):
        raise SystemExit("Error: GEMINI_API_KEY not set. Add it to backend/.env")

    base_dir = os.path.abspath(args.base_dir)
    page_pairs = _parse_pairs(args.pairs)

    all_results = []
    first_upload = True
    for front_page, back_page in page_pairs:
        front_page_path = os.path.join(base_dir, f"page-{front_page}.png")

        if not os.path.isfile(front_page_path):
            raise SystemExit(f"Error: Image not found: {front_page_path}")
        if back_page is None:
            print("=" * 60)
            print(f"  PROCESSING SINGLE PAGE: page-{front_page}")
            print("=" * 60)
            pair_results = _analyze_single_page_coins(front_page_path, base_dir)
            print(f"  Single-page coins analyzed: {len(pair_results)}")
            all_results.extend(pair_results)

            if args.upload and pair_results:
                upload_result = upload_to_firebase(
                    pair_results,
                    args.collection,
                    source_page_path=f"page-{front_page}.png",
                    clear_collection=(args.clear and first_upload),
                    source_batch=os.path.basename(base_dir),
                    ingestion_mode="single-page",
                )
                first_upload = False
                if upload_result:
                    print(f"  Uploaded {upload_result['items_uploaded']} items")
                    print(f"  Collection total: {upload_result['items_total']}")
            continue

        back_page_path = os.path.join(base_dir, f"page-{back_page}.png")
        if not os.path.isfile(back_page_path):
            raise SystemExit(f"Error: Image not found: {back_page_path}")

        print("=" * 60)
        print(f"  PROCESSING PAIR: page-{front_page} + page-{back_page}")
        if args.reverse_back:
            print("  Using right-to-left reversal for back page coins")
        print("=" * 60)
        pair_results = _analyze_paired_coins(front_page_path, back_page_path, base_dir, reverse_back=args.reverse_back)
        print(f"  Paired coins analyzed: {len(pair_results)}")
        all_results.extend(pair_results)

        if args.upload and pair_results:
            upload_result = upload_to_firebase(
                pair_results,
                args.collection,
                source_page_path=f"page-{front_page}-{back_page}.png",
                clear_collection=(args.clear and first_upload),
                source_batch=os.path.basename(base_dir),
                ingestion_mode="paired-pages",
            )
            first_upload = False
            if upload_result:
                print(f"  Uploaded {upload_result['items_uploaded']} items")
                print(f"  Collection total: {upload_result['items_total']}")

    final_catalogue_path = os.path.join(base_dir, "paired_output", "catalogue_all.json")
    os.makedirs(os.path.dirname(final_catalogue_path), exist_ok=True)
    with open(final_catalogue_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 60)
    print(f"  Total paired items processed: {len(all_results)}")
    print(f"  Combined catalogue: {final_catalogue_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
