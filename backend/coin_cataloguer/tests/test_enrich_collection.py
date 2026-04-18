from pathlib import Path

from coin_cataloguer.enrich_collection import (
    analyze_coin_image,
    build_coin_payload,
    resolve_local_image_path,
    resolve_source_page_image_path,
)


def test_resolve_local_image_path_uses_source_batch_and_page():
    item = {
        "image": "gs://indian-heritage-gallery-bucket/images/princely-states/page-5/coin_2.png",
        "metadata": {
            "source_batch": "indian-princely-states-2-2",
            "source_page_path": "page-5",
        },
    }

    resolved = resolve_local_image_path(item, Path("/repo/temp/output/princely-states-draft"))

    assert resolved == Path(
        "/repo/temp/output/princely-states-draft/indian-princely-states-2-2/page-05/coin_2.png"
    )


def test_build_coin_payload_overlays_analysis_and_preserves_provenance():
    item = {
        "metadata": {
            "source_batch": "indian-princely-states-2-2",
            "source_page_path": "page-5",
            "ingestion_mode": "independent-page",
        }
    }
    analysis = {
        "ruler_or_issuer": "Mir Mahboob Ali Khan",
        "year_or_period": "AH 1322 / 1904 AD",
        "mint_or_place": "Hyderabad",
        "denomination": "1 Rupee",
        "series_or_catalog": "KM 35",
        "material": "Silver",
        "condition": "VF",
        "obverse_description": "Persian legends within floral border.",
        "reverse_description": "Charminar motif and date.",
        "weight_estimate": "11.4 g",
        "estimated_price_inr": "3,500 - 5,000",
        "notes": "Better preserved than average.",
        "confidence": "High",
    }

    payload = build_coin_payload(
        item=item,
        analysis=analysis,
        image_path=Path("/repo/temp/output/princely-states-draft/indian-princely-states-2-2/page-05/coin_2.png"),
    )

    assert payload["image_path"].endswith("coin_2.png")
    assert payload["ruler_or_issuer"] == "Mir Mahboob Ali Khan"
    assert payload["estimated_price_inr"] == "3,500 - 5,000"
    assert payload["source_batch"] == "indian-princely-states-2-2"
    assert payload["source_page_path"] == "page-5"


def test_resolve_source_page_image_path_uses_batch_and_page():
    payload = {
        "source_batch": "indian-princely-states-2-2",
        "source_page_path": "page-5",
    }

    resolved = resolve_source_page_image_path(
        payload, Path("/repo/temp/images")
    )

    assert resolved == Path("/repo/temp/images/indian-princely-states-2-2/page-5.png")


def test_analyze_coin_image_uses_tool_function(monkeypatch):
    calls = []

    class FakeTool:
        def __init__(self):
            self.func = lambda image_path: calls.append(image_path) or '{"confidence":"High"}'

    monkeypatch.setattr("coin_cataloguer.enrich_collection.analyze_coin", FakeTool())

    result = analyze_coin_image(Path("/repo/coin.png"))

    assert result["confidence"] == "High"
    assert calls == ["/repo/coin.png"]
