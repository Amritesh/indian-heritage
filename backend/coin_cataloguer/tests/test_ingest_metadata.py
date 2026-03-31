from coin_cataloguer.main import build_uploaded_item


def test_build_uploaded_item_attaches_provenance_and_review_flags():
    coin = {
        "image_path": "/tmp/princely/page-05/coin-1.png",
        "ruler_or_issuer": "Unknown",
        "year_or_period": "",
        "mint_or_place": "",
        "denomination": "Rupee",
        "material": "Silver",
        "estimated_price_inr": "",
        "confidence": "Low",
        "notes": "Needs expert review",
    }

    item = build_uploaded_item(
        coin=coin,
        collection_name="princely-states",
        item_index=1,
        source_page_path="/abs/temp/images/princeley-states-1-1/page-05.png",
        source_batch="princeley-states-1-1",
        ingestion_mode="independent-page",
        gs_url="gs://bucket/images/princely-states/page-05/coin-1.png",
    )

    assert item["title"] == "Rupee - Unknown"
    assert item["metadata"]["source_batch"] == "princeley-states-1-1"
    assert item["metadata"]["source_page_path"].endswith("page-05.png")
    assert item["metadata"]["ingestion_mode"] == "independent-page"
    assert "missing_price" in item["metadata"]["review_flags"]
    assert "low_confidence" in item["metadata"]["review_flags"]
