"""
Custom CrewAI tool that uses Gemini vision to analyze a single coin image
and return detailed numismatic metadata.
"""

import base64
import json
import os
from pathlib import Path

from google import genai
from ._tool_compat import tool


BASE_ANALYSIS_PROMPT = """You are a world-renowned numismatist specializing in Indian coinage,
from ancient punch-marked coins through Mughal, Sultanate, British India, Princely States,
and modern Republic of India coins.

Examine this coin image carefully and provide a thorough analysis:

The input image may show:
- a single side of one coin, or
- a stitched side-by-side image showing obverse and reverse of the same coin.

If both sides are visible, use both together to improve identification accuracy.
If only one side is visible, make the best identification possible from that side alone.

1. **Ruler / Issuer**: Who issued this coin? (Emperor, King, Government, etc.)
2. **Year / Period**: When was it minted? Look for dates in various calendars (AD, AH, VS, SE).
3. **Mint / Place**: Where was it minted? Look for mint marks or legends.
4. **Denomination**: What is the face value?
5. **Series / Catalog**: Any known catalog reference (Krause, Fishman, etc.)
6. **Material**: What metal is it made from?
7. **Condition**: Grade the coin's condition using standard numismatic grades.
8. **Obverse**: Describe what's on the front.
9. **Reverse**: Describe what's on the back.
10. **Weight estimate**: Standard weight for this coin type.
11. **Estimated price**: Market value range in INR.
12. **Notes**: Any special features, die varieties, rarity, or historical significance.
13. **Confidence**: How confident are you in this identification?

Be as specific as possible. If you cannot determine a field, provide your best educated guess
with appropriate caveats in the notes. Look at legends (Devanagari, Persian, English, etc.),
portraits, symbols, and edge details.

Return ONLY valid JSON in this exact format:
{
  "ruler_or_issuer": "<string>",
  "year_or_period": "<string>",
  "mint_or_place": "<string>",
  "denomination": "<string>",
  "series_or_catalog": "<string>",
  "material": "<string>",
  "condition": "<string>",
  "obverse_description": "<string>",
  "reverse_description": "<string>",
  "weight_estimate": "<string>",
  "estimated_price_inr": "<string>",
  "notes": "<string>",
  "confidence": "<High|Medium|Low>"
}"""


def _load_reference_context(reference_context: str | None = None):
    if reference_context and reference_context.strip():
        return reference_context.strip()

    reference_path = os.environ.get("AHG_REFERENCE_CONTEXT_FILE", "").strip()
    if reference_path and os.path.isfile(reference_path):
        with open(reference_path, "r", encoding="utf-8") as file_obj:
            return file_obj.read().strip()

    return os.environ.get("AHG_REFERENCE_CONTEXT", "").strip()


def _build_analysis_prompt(reference_context: str | None = None):
    context = _load_reference_context(reference_context)
    if not context:
        return BASE_ANALYSIS_PROMPT

    return (
        f"{BASE_ANALYSIS_PROMPT}\n\n"
        "Reference archive context:\n"
        "Use the following collection notes, canonical rulers/mints, and denomination hints as"
        " supporting evidence when they match the visible coin. Do not force a match if the image disagrees.\n"
        f"{context}\n"
    )


def _parse_analysis_payload(payload_text: str):
    try:
        return json.loads(payload_text)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        parsed, _ = decoder.raw_decode(payload_text.lstrip())
        return parsed


@tool("analyze_coin")
def analyze_coin(image_path: str) -> str:
    """Takes a single coin image file path and analyzes it using Gemini vision. Returns detailed numismatic metadata as a JSON string including ruler, year, mint, denomination, material, condition, price estimate, and more."""
    image_path = image_path.strip().strip("'\"")

    if not os.path.isfile(image_path):
        return f"Error: Image file not found: {image_path}"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    ext = Path(image_path).suffix.lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": _build_analysis_prompt()},
                    {"inline_data": {"mime_type": mime, "data": base64.b64encode(image_bytes).decode("utf-8")}},
                ],
            }
        ],
        config={
            "response_mime_type": "application/json",
        },
    )

    analysis = _parse_analysis_payload(response.text)
    if isinstance(analysis, list):
        analysis = next((item for item in analysis if isinstance(item, dict)), {})
    if not isinstance(analysis, dict):
        analysis = {"notes": f"Unexpected analyzer output: {analysis}", "confidence": "Low"}
    analysis["image_path"] = image_path

    return json.dumps(analysis, indent=2)


def analyze_coin_image(image_path: str, reference_context: str | None = None):
    """Reference-aware helper for ingest scripts and future upload APIs."""
    image_path = image_path.strip().strip("'\"")

    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    with open(image_path, "rb") as file_obj:
        image_bytes = file_obj.read()

    ext = Path(image_path).suffix.lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": _build_analysis_prompt(reference_context)},
                    {"inline_data": {"mime_type": mime, "data": base64.b64encode(image_bytes).decode("utf-8")}},
                ],
            }
        ],
        config={
            "response_mime_type": "application/json",
        },
    )

    analysis = _parse_analysis_payload(response.text)
    if isinstance(analysis, list):
        analysis = next((item for item in analysis if isinstance(item, dict)), {})
    if not isinstance(analysis, dict):
        analysis = {"notes": f"Unexpected analyzer output: {analysis}", "confidence": "Low"}
    analysis["image_path"] = image_path
    return analysis
