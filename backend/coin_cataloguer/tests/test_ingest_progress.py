from coin_cataloguer.ingest_progress import build_remote_run_payload, build_run_summary


def test_build_run_summary_counts_completed_and_failed_pages():
    summary = build_run_summary(
        [
            {"status": "completed"},
            {"status": "completed"},
            {"status": "failed"},
        ]
    )

    assert summary["completedPages"] == 2
    assert summary["failedPages"] == 1
    assert summary["totalPages"] == 3


def test_build_remote_run_payload_uses_online_shape():
    payload = build_remote_run_payload(
        run_id="run-1",
        collection_slug="princely-states",
        status="running",
        started_at="2026-04-01T10:00:00+00:00",
        updated_at="2026-04-01T10:05:00+00:00",
        page_entries=[
            {"status": "completed"},
            {"status": "failed"},
        ],
    )

    assert payload["id"] == "run-1"
    assert payload["collectionSlug"] == "princely-states"
    assert payload["status"] == "running"
    assert payload["summary"]["completedPages"] == 1
    assert payload["summary"]["failedPages"] == 1
    assert payload["summary"]["totalPages"] == 2
