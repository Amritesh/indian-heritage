from types import SimpleNamespace

import coin_cataloguer.batch_ingest as batch_ingest
from coin_cataloguer.batch_ingest import build_princely_states_plan


def test_build_princely_states_plan_uses_expected_page_ranges():
    plan = build_princely_states_plan("/repo/temp/images")

    assert plan["collection"] == "princely-states"
    assert plan["sources"][0]["folder"] == "princeley-states-1-1"
    assert plan["sources"][0]["pages"] == list(range(5, 17))
    assert plan["sources"][1]["folder"] == "indian-princely-states-2-2"
    assert plan["sources"][1]["pages"] == list(range(4, 21))


def test_build_initial_run_payload_counts_populated_pages():
    plan = {
        "collection": "princely-states",
        "sources": [
            {"folder": "princeley-states-1-1", "pages": [5, 6]},
            {"folder": "indian-princely-states-2-2", "pages": [4]},
        ],
    }

    progress_path, run_payload, page_jobs = batch_ingest.build_initial_run_payload(
        plan=plan,
        collection_name="princely-states",
        images_root="/repo/temp/images",
        output_root="/repo/temp/output/princely-states",
        run_id="run-1",
    )

    assert progress_path.endswith("run-1.json")
    assert run_payload["status"] == "running"
    assert run_payload["summary"]["totalPages"] == 3
    assert run_payload["summary"]["completedPages"] == 0
    assert [page["status"] for page in run_payload["pages"]] == ["pending", "pending", "pending"]
    assert len(page_jobs) == 3


def test_process_page_job_marks_upload_failure_and_keeps_clear_first_available(monkeypatch):
    upload_calls = []

    monkeypatch.setattr(
        batch_ingest,
        "run_cataloguer_for_image",
        lambda **kwargs: {
            "catalogue_path": "/tmp/catalogue.json",
            "catalogue_data": [{"image_path": "/tmp/coin.png"}],
            "save_dir": "/tmp",
        },
    )
    monkeypatch.setattr(batch_ingest.os.path, "isfile", lambda path: True)

    def fake_upload_to_firebase(*args, **kwargs):
        upload_calls.append(kwargs["clear_collection"])
        return None

    monkeypatch.setattr(batch_ingest, "upload_to_firebase", fake_upload_to_firebase)

    page_record, first_upload = batch_ingest.process_page_job(
        job={
            "source": {"folder": "princeley-states-1-1"},
            "pageNumber": 5,
            "imagePath": "/repo/temp/images/princeley-states-1-1/page-5.png",
            "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-05",
        },
        collection_name="princely-states",
        args=SimpleNamespace(upload=True, clear_first=True),
        first_upload=True,
    )

    assert page_record["status"] == "failed"
    assert "upload" in page_record["error"].lower()
    assert first_upload is True
    assert upload_calls == [True]


def test_process_page_job_consumes_clear_first_only_after_success(monkeypatch):
    upload_calls = []
    upload_results = iter(
        [
            None,
            {"collection_id": "princely-states", "items_uploaded": 1, "items_total": 1},
            {"collection_id": "princely-states", "items_uploaded": 1, "items_total": 1},
        ]
    )

    monkeypatch.setattr(
        batch_ingest,
        "run_cataloguer_for_image",
        lambda **kwargs: {
            "catalogue_path": "/tmp/catalogue.json",
            "catalogue_data": [{"image_path": "/tmp/coin.png"}],
            "save_dir": "/tmp",
        },
    )
    monkeypatch.setattr(batch_ingest.os.path, "isfile", lambda path: True)

    def fake_upload_to_firebase(*args, **kwargs):
        upload_calls.append(kwargs["clear_collection"])
        return next(upload_results)

    monkeypatch.setattr(batch_ingest, "upload_to_firebase", fake_upload_to_firebase)

    page_1, first_upload = batch_ingest.process_page_job(
        job={
            "source": {"folder": "princeley-states-1-1"},
            "pageNumber": 5,
            "imagePath": "/repo/temp/images/princeley-states-1-1/page-5.png",
            "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-05",
        },
        collection_name="princely-states",
        args=SimpleNamespace(upload=True, clear_first=True),
        first_upload=True,
    )

    page_2, first_upload = batch_ingest.process_page_job(
        job={
            "source": {"folder": "princeley-states-1-1"},
            "pageNumber": 6,
            "imagePath": "/repo/temp/images/princeley-states-1-1/page-6.png",
            "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-06",
        },
        collection_name="princely-states",
        args=SimpleNamespace(upload=True, clear_first=True),
        first_upload=first_upload,
    )

    page_3, first_upload = batch_ingest.process_page_job(
        job={
            "source": {"folder": "indian-princely-states-2-2"},
            "pageNumber": 4,
            "imagePath": "/repo/temp/images/indian-princely-states-2-2/page-4.png",
            "outputDir": "/repo/temp/output/princely-states/indian-princely-states-2-2/page-04",
        },
        collection_name="princely-states",
        args=SimpleNamespace(upload=True, clear_first=True),
        first_upload=first_upload,
    )

    assert page_1["status"] == "failed"
    assert page_2["status"] == "completed"
    assert page_3["status"] == "completed"
    assert upload_calls == [True, True, False]
    assert first_upload is False
