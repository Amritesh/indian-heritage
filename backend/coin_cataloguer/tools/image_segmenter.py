"""
Custom CrewAI tool that uses Gemini vision to detect coin bounding boxes
in a composite image, then crops each coin with Pillow.
"""

import base64
import json
import os
from pathlib import Path

from crewai.tools import tool
from google import genai
from PIL import Image


DETECTION_PROMPT = """You are an expert image analyst specializing in numismatic album pages.

This image is a page from a coin collection album. Coins are typically placed inside holders,
flips, pockets, or cardboard 2x2 mounts. Each holder usually has handwritten or printed text
describing the coin (ruler name, year, denomination, mint, weight, etc.).

Your job: identify EVERY individual coin holder/pocket on this page. The bounding box must
capture the ENTIRE holder including:
- The coin itself
- The cardboard/plastic holder or flip surrounding it
- ALL text, labels, and handwritten notes on or around the holder
- Any price tags, catalog numbers, or stickers

For each coin holder, return its bounding box as a PERCENTAGE of the overall image dimensions:
- x_pct: left edge as percentage of image width (0-100)
- y_pct: top edge as percentage of image height (0-100)
- w_pct: width as percentage of image width
- h_pct: height as percentage of image height

Guidelines:
- Include ALL coin holders, even partially visible ones
- Bounding box must be GENEROUS - include the full holder card and all surrounding text
- Do NOT crop tightly to just the coin metal - include the entire mount/holder
- If holders are in a grid, each cell is one holder
- Number them left-to-right, top-to-bottom (index starting at 1)
- Provide a brief label describing what you see (e.g., "silver rupee in 2x2 holder with text")
- Do NOT miss any coins on the page

Return ONLY valid JSON in this exact format:
{
  "image_width": <int>,
  "image_height": <int>,
  "coins": [
    {
      "index": 1,
      "x_pct": <float>,
      "y_pct": <float>,
      "w_pct": <float>,
      "h_pct": <float>,
      "brief_label": "<string>"
    }
  ]
}"""

# Module-level variable for output directory, set by create_tool()
_output_dir = ""


def _parse_detection_payload(payload_text: str):
    try:
        return json.loads(payload_text)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        parsed, _ = decoder.raw_decode(payload_text.lstrip())
        return parsed


def create_tool(output_dir: str = ""):
    """Create the segment_coins tool with the given output directory."""
    global _output_dir
    _output_dir = output_dir
    return segment_coins


@tool("segment_coins")
def segment_coins(image_path: str) -> str:
    """Takes an image file path containing multiple coins, detects each coin using Gemini vision, crops them individually, and saves them to the output directory. Returns a JSON string listing the cropped image paths."""
    image_path = image_path.strip().strip("'\"")

    if not os.path.isfile(image_path):
        return f"Error: Image file not found: {image_path}"

    out_dir = _output_dir or os.path.join(os.path.dirname(image_path), "coins_output")
    os.makedirs(out_dir, exist_ok=True)

    # Read image bytes and prepare for Gemini
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    ext = Path(image_path).suffix.lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    # Call Gemini to detect coin bounding boxes
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": DETECTION_PROMPT},
                    {"inline_data": {"mime_type": mime, "data": base64.b64encode(image_bytes).decode("utf-8")}},
                ],
            }
        ],
        config={
            "response_mime_type": "application/json",
        },
    )

    detection = _parse_detection_payload(response.text)
    coins = detection.get("coins", [])

    if not coins:
        return "No coins detected in the image."

    # Open image with Pillow and crop each coin
    img = Image.open(image_path)
    img_w, img_h = img.size

    cropped_paths = []
    for coin in coins:
        idx = coin["index"]
        x = int(coin["x_pct"] / 100 * img_w)
        y = int(coin["y_pct"] / 100 * img_h)
        w = int(coin["w_pct"] / 100 * img_w)
        h = int(coin["h_pct"] / 100 * img_h)

        # Clamp to image bounds
        x = max(0, x)
        y = max(0, y)
        w = min(w, img_w - x)
        h = min(h, img_h - y)

        if w <= 0 or h <= 0:
            continue

        crop = img.crop((x, y, x + w, y + h))
        crop_path = os.path.join(out_dir, f"coin_{idx}.png")
        crop.save(crop_path, "PNG")
        cropped_paths.append(
            {
                "index": idx,
                "path": crop_path,
                "label": coin.get("brief_label", ""),
                "bbox": {"x": x, "y": y, "width": w, "height": h},
            }
        )

    result = {
        "total_coins_detected": len(cropped_paths),
        "output_directory": out_dir,
        "coins": cropped_paths,
    }
    return json.dumps(result, indent=2)
