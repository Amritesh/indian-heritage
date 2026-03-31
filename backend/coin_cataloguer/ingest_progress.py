import json
import os
from datetime import datetime, timezone


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def build_run_summary(page_entries):
    pages = page_entries or []
    return {
        "totalPages": len(pages),
        "completedPages": sum(1 for page in pages if page.get("status") == "completed"),
        "failedPages": sum(1 for page in pages if page.get("status") == "failed"),
        "runningPages": sum(1 for page in pages if page.get("status") == "running"),
    }


def build_remote_run_payload(
    *,
    run_id,
    collection_slug,
    status,
    started_at,
    updated_at,
    page_entries,
):
    return {
        "id": run_id,
        "collectionSlug": collection_slug,
        "status": status,
        "startedAt": started_at,
        "updatedAt": updated_at,
        "summary": build_run_summary(page_entries),
        "pages": page_entries or [],
    }


def write_local_progress(path, payload):
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def update_remote_progress(database, run_id, payload):
    if database is None:
        return False
    database.child("ingest_runs").child(run_id).set(payload)
    return True
