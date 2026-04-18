from coin_cataloguer.main import _normalize_existing_item, build_review_flags, build_uploaded_item


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
    assert item["metadata"]["source_page_path"] == "page-05"
    assert item["metadata"]["ingestion_mode"] == "independent-page"
    assert "missing_price" in item["metadata"]["review_flags"]
    assert "low_confidence" in item["metadata"]["review_flags"]


def test_build_uploaded_item_normalizes_blank_user_visible_fields():
    item = build_uploaded_item(
        coin={
            "image_path": "/tmp/princely/page-05/coin-1.png",
            "ruler_or_issuer": None,
            "year_or_period": " ",
            "mint_or_place": None,
            "denomination": None,
            "material": None,
            "estimated_price_inr": None,
            "confidence": None,
            "notes": "",
        },
        collection_name="princely-states",
        item_index=1,
        source_page_path="/abs/temp/images/princeley-states-1-1/page-05.png",
        source_batch="princeley-states-1-1",
        ingestion_mode="independent-page",
        gs_url="",
    )

    assert item["title"] == "Unknown - Unknown"
    assert item["description"] == "Unknown issued by Unknown."
    assert item["period"] is None
    assert item["region"] is None
    assert item["materials"] == ["Unknown"]


def test_build_review_flags_handles_none_values():
    flags = build_review_flags(
        {
            "estimated_price_inr": None,
            "mint_or_place": None,
            "ruler_or_issuer": None,
            "confidence": None,
        }
    )

    assert "missing_price" in flags
    assert "missing_mint" in flags
    assert "missing_issuer" in flags
    assert "low_confidence" not in flags


def test_normalize_existing_item_adds_metadata_defaults():
    item = _normalize_existing_item(
        {
            "id": "coin-1",
            "page": 3,
            "title": "Legacy Coin",
            "period": "1600-1700",
            "region": "Jaipur",
            "image": "gs://bucket/legacy.png",
            "notes": "Legacy note",
            "display_labels": ["₹100"],
            "description": "Legacy description",
            "source_page_path": "/Users/someone/Desktop/images/page-05.png",
            "metadata": {
                "type": "coin",
                "ruler_or_issuer": "Akbar",
                "year_or_period": "1600-1700",
                "mint_or_place": "Jaipur",
                "denomination": "Rupee",
                "series_or_catalog": "",
                "material": "Silver",
                "condition": "",
                "weight_estimate": "",
                "estimated_price_inr": "100",
                "confidence": "Medium",
            },
        }
    )

    assert "ingest_status" not in item["metadata"]
    assert item["metadata"]["review_flags"] == []
    assert item["metadata"]["source_batch"] == ""
    assert item["metadata"]["source_page_path"] == "page-05"
    assert item["metadata"]["ingestion_mode"] == "legacy"
