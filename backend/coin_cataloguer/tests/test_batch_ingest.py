from copy import deepcopy
from types import SimpleNamespace
import sys

import coin_cataloguer.batch_ingest as batch_ingest
import coin_cataloguer.main as main_module
from coin_cataloguer.batch_ingest import build_princely_states_plan
from coin_cataloguer.main import get_catalogue_entries, save_catalogue_result


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


def test_process_page_job_fails_when_upload_mode_has_no_entries(monkeypatch):
    upload_calls = []

    monkeypatch.setattr(
        batch_ingest,
        "run_cataloguer_for_image",
        lambda **kwargs: {
            "catalogue_path": "/tmp/catalogue.json",
            "catalogue_data": [],
            "save_dir": "/tmp",
        },
    )
    monkeypatch.setattr(batch_ingest.os.path, "isfile", lambda path: True)

    def fake_upload_to_firebase(*args, **kwargs):
        upload_calls.append(True)
        return {"collection_id": "princely-states", "items_uploaded": 1, "items_total": 1}

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
    assert "uploadable entries" in page_record["error"].lower()
    assert upload_calls == []
    assert first_upload is True


def test_process_page_job_fails_when_unstructured_catalogue_has_no_entries(monkeypatch):
    monkeypatch.setattr(
        batch_ingest,
        "run_cataloguer_for_image",
        lambda **kwargs: {
            "catalogue_path": "/tmp/catalogue.json",
            "catalogue_data": [],
            "save_dir": "/tmp",
        },
    )
    monkeypatch.setattr(batch_ingest.os.path, "isfile", lambda path: True)

    page_record, first_upload = batch_ingest.process_page_job(
        job={
            "source": {"folder": "princeley-states-1-1"},
            "pageNumber": 5,
            "imagePath": "/repo/temp/images/princeley-states-1-1/page-5.png",
            "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-05",
        },
        collection_name="princely-states",
        args=SimpleNamespace(upload=False, clear_first=False),
        first_upload=True,
    )

    assert page_record["status"] == "failed"
    assert "no structured catalogue entries" in page_record["error"].lower()
    assert first_upload is True


def test_main_prints_run_id_from_initial_payload(monkeypatch, capsys):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(batch_ingest, "build_initial_run_payload", lambda **kwargs: ("/tmp/run-1.json", {"runId": "run-1", "summary": {"completedPages": 0, "failedPages": 0, "totalPages": 1}, "pages": [{}]}, [{}]))
    monkeypatch.setattr(batch_ingest, "process_page_job", lambda **kwargs: ({"status": "completed"}, False))
    monkeypatch.setattr(batch_ingest, "_write_progress", lambda *args, **kwargs: None)
    monkeypatch.setattr(batch_ingest.os, "makedirs", lambda *args, **kwargs: None)
    monkeypatch.setattr(sys, "argv", ["batch_ingest", "--images-root", "/repo/temp/images", "--output-root", "/repo/temp/output/princely-states"])

    batch_ingest.main()

    captured = capsys.readouterr()
    assert "Run ID: run-1" in captured.out


def test_save_catalogue_result_preserves_native_list_result(tmp_path):
    source = [{"image_path": "/tmp/coin.png", "ruler_or_issuer": "Akbar"}]

    result = save_catalogue_result(
        result=source,
        image_path="/repo/temp/images/page-5.png",
        output_dir=str(tmp_path),
    )

    assert result["catalogue_data"] == source
    assert result["catalogue_path"].endswith("catalogue.json")


def test_save_catalogue_result_preserves_native_dict_result(tmp_path):
    source = {"catalogue": [{"image_path": "/tmp/coin.png", "ruler_or_issuer": "Akbar"}]}

    result = save_catalogue_result(
        result=source,
        image_path="/repo/temp/images/page-5.png",
        output_dir=str(tmp_path),
    )

    assert result["catalogue_data"] == source
    assert result["catalogue_path"].endswith("catalogue.json")


def test_main_writes_running_page_snapshot_before_completion(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    writes = []

    def fake_write_progress(_path, payload):
        writes.append(deepcopy(payload))

    monkeypatch.setattr(
        batch_ingest,
        "build_initial_run_payload",
        lambda **kwargs: (
            "/tmp/run-1.json",
            {
                "runId": "run-1",
                "status": "running",
                "summary": {"completedPages": 0, "failedPages": 0, "totalPages": 1},
                "pages": [
                    {
                        "sourceBatch": "princeley-states-1-1",
                        "pageNumber": 5,
                        "imagePath": "/repo/temp/images/princeley-states-1-1/page-5.png",
                        "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-05",
                        "status": "pending",
                        "cataloguePath": "",
                        "itemsUploaded": 0,
                        "error": "",
                    }
                ],
            },
            [
                {
                    "source": {"folder": "princeley-states-1-1"},
                    "pageNumber": 5,
                    "imagePath": "/repo/temp/images/princeley-states-1-1/page-5.png",
                    "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-05",
                }
            ],
        ),
    )
    monkeypatch.setattr(
        batch_ingest,
        "process_page_job",
        lambda **kwargs: (
            {
                "sourceBatch": "princeley-states-1-1",
                "pageNumber": 5,
                "imagePath": "/repo/temp/images/princeley-states-1-1/page-5.png",
                "outputDir": "/repo/temp/output/princely-states/princeley-states-1-1/page-05",
                "status": "completed",
                "cataloguePath": "/tmp/catalogue.json",
                "itemsUploaded": 1,
                "error": "",
            },
            False,
        ),
    )
    monkeypatch.setattr(batch_ingest, "_write_progress", fake_write_progress)
    monkeypatch.setattr(batch_ingest.os, "makedirs", lambda *args, **kwargs: None)
    monkeypatch.setattr(sys, "argv", ["batch_ingest", "--images-root", "/repo/temp/images", "--output-root", "/repo/temp/output/princely-states"])

    batch_ingest.main()

    statuses = [snapshot["pages"][0]["status"] for snapshot in writes]
    assert "running" in statuses
    assert "completed" in statuses
    assert statuses.index("running") < statuses.index("completed")


def test_get_catalogue_entries_rejects_non_list_catalogue_payload():
    try:
        get_catalogue_entries({"catalogue": {"image_path": "/tmp/coin.png"}})
    except ValueError as exc:
        assert "catalogue" in str(exc).lower()
    else:
        raise AssertionError("expected ValueError for malformed catalogue payload")


def test_find_env_path_prefers_backend_env_over_parent_env(tmp_path, monkeypatch):
    worktree_backend = tmp_path / "worktree" / "backend"
    worktree_backend.mkdir(parents=True)
    preferred_env = worktree_backend / ".env"
    preferred_env.write_text("GEMINI_API_KEY=preferred\n", encoding="utf-8")
    parent_env = tmp_path / "worktree" / ".env"
    parent_env.write_text("GEMINI_API_KEY=parent\n", encoding="utf-8")

    fake_main_path = worktree_backend / "coin_cataloguer" / "main.py"
    monkeypatch.setattr(main_module, "__file__", str(fake_main_path))

    assert main_module._find_env_path() == str(preferred_env)


def test_main_handles_malformed_catalogue_payload_in_upload_mode(monkeypatch, capsys):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        main_module,
        "run_cataloguer_for_image",
        lambda **kwargs: {
            "catalogue_path": "/tmp/catalogue.json",
            "catalogue_data": {"catalogue": {"image_path": "/tmp/coin.png"}},
            "save_dir": "/tmp",
        },
    )
    monkeypatch.setattr(main_module, "upload_to_firebase", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("upload should not be called")))
    monkeypatch.setattr(sys, "argv", ["main", "--image", "/repo/temp/images/page-5.png", "--upload"])
    monkeypatch.setattr(main_module.os.path, "isfile", lambda path: True)
    monkeypatch.setattr(main_module, "_find_env_path", lambda: "/repo/backend/.env")
    monkeypatch.setattr(main_module, "load_dotenv", lambda *args, **kwargs: None)

    main_module.main()

    captured = capsys.readouterr()
    assert "could not parse catalogue for upload" in captured.out.lower()
