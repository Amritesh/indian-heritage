from coin_cataloguer.tools.image_segmenter import _parse_detection_payload


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
