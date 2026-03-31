import json
import os
from datetime import datetime, timezone


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


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
