from coin_cataloguer.tools.image_segmenter import _parse_detection_payload
from coin_cataloguer.tools.coin_analyzer import _parse_analysis_payload


def test_parse_detection_payload_accepts_trailing_text_after_json():
    payload = """
{
  "image_width": 1000,
  "image_height": 2000,
  "coins": [
    {"index": 1, "x_pct": 10, "y_pct": 20, "w_pct": 30, "h_pct": 40, "brief_label": "coin in holder"}
  ]
}
Additional notes that should be ignored.
"""

    parsed = _parse_detection_payload(payload)

    assert parsed["image_width"] == 1000
    assert len(parsed["coins"]) == 1


def test_parse_analysis_payload_accepts_trailing_text_after_json():
    payload = """
{
  "ruler_or_issuer": "Akbar",
  "year_or_period": "1600 AD",
  "mint_or_place": "Agra",
  "denomination": "Rupee",
  "series_or_catalog": "KM",
  "material": "Silver",
  "condition": "VF",
  "obverse_description": "legend",
  "reverse_description": "mint",
  "weight_estimate": "11.4 g",
  "estimated_price_inr": "5000 - 7000",
  "notes": "sample",
  "confidence": "High"
}
Trailing notes to ignore.
"""

    parsed = _parse_analysis_payload(payload)

    assert parsed["ruler_or_issuer"] == "Akbar"
    assert parsed["estimated_price_inr"] == "5000 - 7000"
