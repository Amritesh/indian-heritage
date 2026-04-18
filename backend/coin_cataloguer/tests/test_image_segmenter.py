from coin_cataloguer.tools._genai_retry import is_transient_genai_error, run_with_transient_retry
from coin_cataloguer.tools.image_segmenter import _parse_detection_payload
from coin_cataloguer.tools.coin_analyzer import _parse_analysis_payload
import time


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


def test_transient_retry_classifies_ssl_eof_errors():
    error = RuntimeError("[SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol")

    assert is_transient_genai_error(error) is True


def test_transient_retry_retries_until_success():
    attempts = {"count": 0}

    def flaky_call():
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise RuntimeError("ConnectError: [SSL: UNEXPECTED_EOF_WHILE_READING]")
        return "ok"

    result = run_with_transient_retry(flaky_call, attempts=3, base_delay_seconds=0)

    assert result == "ok"
    assert attempts["count"] == 3


def test_transient_retry_times_out_and_retries():
    attempts = {"count": 0}

    def slow_call():
        attempts["count"] += 1
        time.sleep(0.05)
        return "too-late"

    try:
        run_with_transient_retry(
            slow_call,
            attempts=2,
            base_delay_seconds=0,
            timeout_seconds=0.01,
        )
    except TimeoutError as error:
        assert "timed out" in str(error).lower()
    else:
        raise AssertionError("Expected run_with_transient_retry to raise TimeoutError")

    assert attempts["count"] == 2
