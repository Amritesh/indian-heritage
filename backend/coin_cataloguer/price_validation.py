import json
import math
import os
import re
import urllib.parse
import urllib.request
from html import unescape
from typing import Any, Dict, List, Optional

from google import genai


TROY_OUNCE_GRAMS = 31.1034768


def parse_numeric_values(text: str | None) -> List[float]:
    return [
        float(value.replace(",", ""))
        for value in re.findall(r"\d[\d,]*(?:\.\d+)?", str(text or ""))
    ]


def parse_weight_grams(weight_text: str | None) -> Optional[float]:
    values = parse_numeric_values(weight_text)
    return values[0] if values else None


def _parse_declared_purity(material_text: str) -> Optional[float]:
    normalized = material_text.lower()
    decimal_matches = re.findall(r"(?:^|[^\d])(0\.\d{3}|0\.\d{2}|\.?\d{3}|\.?\d{2})(?:[^\d]|$)", normalized)
    for match in decimal_matches:
        value = match if match.startswith("0") else f"0{match}"
        try:
            purity = float(value)
        except ValueError:
            continue
        if 0 < purity <= 1:
            return purity

    pct_match = re.search(r"(\d{1,3}(?:\.\d+)?)\s*%\s*silver", normalized)
    if pct_match:
        return float(pct_match.group(1)) / 100

    return None


def detect_metal_profile(materials: List[str]) -> Dict[str, Any]:
    text = " | ".join(materials or [])
    normalized = text.lower()

    if not normalized:
        return {"metal": None, "purity": 0.0}

    if "gold" in normalized and "gold-plated" not in normalized and "debased gold" not in normalized:
        return {"metal": "gold", "purity": _parse_declared_purity(normalized) or 1.0}

    if "silver" in normalized or "quaternary silver" in normalized or "billon" in normalized:
        if "billon" in normalized and "silver" not in normalized:
            purity = 0.25
        else:
            purity = _parse_declared_purity(normalized) or (0.25 if "billon" in normalized else 1.0)
        return {"metal": "silver", "purity": purity}

    return {"metal": None, "purity": 0.0}


def compute_intrinsic_metal_value_inr(
    *,
    materials: List[str],
    weight_text: str | None,
    gold_24k_inr_per_gram: float,
    silver_999_inr_per_gram: float,
) -> int:
    weight_grams = parse_weight_grams(weight_text)
    if not weight_grams:
        return 0

    profile = detect_metal_profile(materials)
    if profile["metal"] == "gold":
        return math.floor(weight_grams * gold_24k_inr_per_gram * profile["purity"] + 0.5)
    if profile["metal"] == "silver":
        return math.floor(weight_grams * silver_999_inr_per_gram * profile["purity"] + 0.5)
    return 0


def assess_price_validation(
    *,
    materials: List[str],
    weight_text: str | None,
    estimated_price_text: str | None,
    gold_24k_inr_per_gram: float,
    silver_999_inr_per_gram: float,
) -> Dict[str, Any]:
    values = parse_numeric_values(estimated_price_text)
    metal_value = compute_intrinsic_metal_value_inr(
        materials=materials,
        weight_text=weight_text,
        gold_24k_inr_per_gram=gold_24k_inr_per_gram,
        silver_999_inr_per_gram=silver_999_inr_per_gram,
    )

    flags: List[str] = []
    if not values:
        flags.append("missing_price")

    status = "ok"
    if metal_value > 0 and values:
        estimated_max = max(values)
        if estimated_max < metal_value * 0.95:
            flags.append("below_metal_floor")
            status = "below_metal_floor"
        elif min(values) < metal_value * 0.95:
            flags.append("below_metal_floor_min")
            status = "needs_review"
    elif metal_value > 0 and not values:
        status = "needs_review"
        flags.append("missing_price")

    return {
        "status": status,
        "flags": flags,
        "metal_value_inr": metal_value,
        "current_price_values": values,
    }


def fetch_bullion_rates() -> Dict[str, Any]:
    def _get_json(url: str) -> Dict[str, Any]:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))

    gold = _get_json("https://api.gold-api.com/price/XAU")
    silver = _get_json("https://api.gold-api.com/price/XAG")
    fx = _get_json("https://open.er-api.com/v6/latest/USD")

    usd_inr = float(fx["rates"]["INR"])
    gold_per_gram = round((float(gold["price"]) * usd_inr) / TROY_OUNCE_GRAMS, 2)
    silver_per_gram = round((float(silver["price"]) * usd_inr) / TROY_OUNCE_GRAMS, 2)

    return {
        "as_of": gold.get("updatedAt") or silver.get("updatedAt"),
        "usd_inr": usd_inr,
        "gold_24k_inr_per_gram": gold_per_gram,
        "silver_999_inr_per_gram": silver_per_gram,
        "gold_source": "https://api.gold-api.com/price/XAU",
        "silver_source": "https://api.gold-api.com/price/XAG",
        "fx_source": "https://open.er-api.com/v6/latest/USD",
    }


def _clean_duckduckgo_url(url: str) -> str:
    if url.startswith("//duckduckgo.com/l/?"):
        parsed = urllib.parse.urlparse("https:" + url)
        params = urllib.parse.parse_qs(parsed.query)
        if "uddg" in params:
            return urllib.parse.unquote(params["uddg"][0])
    return url


def search_market_context(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    req = urllib.request.Request(
        f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        html_text = response.read().decode("utf-8", errors="ignore")

    links = re.findall(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html_text)
    snippets = [
        unescape(re.sub("<.*?>", "", match[0] or match[1])).strip()
        for match in re.findall(r'<a[^>]+class="result__snippet"[^>]*>(.*?)</a>|<div class="result__snippet">(.*?)</div>', html_text)
    ]

    results: List[Dict[str, str]] = []
    for index, (href, raw_title) in enumerate(links[:max_results]):
        title = unescape(re.sub("<.*?>", "", raw_title)).strip()
        snippet = snippets[index] if index < len(snippets) else ""
        results.append(
            {
                "title": title,
                "url": _clean_duckduckgo_url(href),
                "snippet": snippet,
            }
        )
    return results


def should_research_item(*, item: Dict[str, Any], assessment: Dict[str, Any]) -> bool:
    metadata = item.get("metadata", {})
    materials = item.get("materials") or []
    profile = detect_metal_profile(materials)
    current_values = assessment["current_price_values"]

    if "below_metal_floor" in assessment["flags"]:
        return True
    if profile["metal"] == "gold":
        return True
    if profile["metal"] == "silver" and max(current_values or [0]) >= 50000:
        return True
    if not current_values and profile["metal"] in {"gold", "silver"}:
        return True
    if str(metadata.get("confidence", "")).strip().lower() in {"low", "0", "0.0"}:
        return True
    return False


def research_validated_price(
    *,
    item: Dict[str, Any],
    rates: Dict[str, Any],
    assessment: Dict[str, Any],
    search_results: List[Dict[str, str]],
) -> Optional[Dict[str, Any]]:
    if not os.environ.get("GEMINI_API_KEY"):
        return None

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    prompt = f"""
You are validating numismatic price data for a catalog.

Return ONLY JSON with this shape:
{{
  "validated_price_min": <number>,
  "validated_price_max": <number>,
  "validated_price_text": "<string>",
  "confidence": "high" | "medium" | "low",
  "manual_review_required": <true|false>,
  "reasoning": "<short string>"
}}

Rules:
- Never return a max below the bullion floor if the item is gold or silver.
- Be conservative.
- Use the search results only as directional market evidence.
- If evidence is weak, widen the range and set manual_review_required=true.

Item:
{json.dumps({
    "title": item.get("title"),
    "period": item.get("period"),
    "materials": item.get("materials"),
    "metadata": item.get("metadata"),
    "current_price_text": item.get("metadata", {}).get("estimated_price_inr") or item.get("metadata", {}).get("estimatedPriceInr"),
    "metal_value_inr": assessment.get("metal_value_inr"),
    "bullion_rates": rates,
    "search_results": search_results[:5],
}, ensure_ascii=False)}
""".strip()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    return json.loads(response.text)
