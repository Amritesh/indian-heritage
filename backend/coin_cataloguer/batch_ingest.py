import argparse
import os
import sys

from dotenv import load_dotenv

from .ingest_progress import utc_now_iso, write_local_progress
from .main import _find_env_path, get_catalogue_entries, run_cataloguer_for_image, upload_to_firebase


def build_princely_states_plan(images_root):
    return {
        "collection": "princely-states",
        "images_root": os.path.abspath(images_root),
        "sources": [
            {"folder": "princeley-states-1-1", "pages": list(range(5, 17))},
            {"folder": "indian-princely-states-2-2", "pages": list(range(4, 21))},
        ],
    }


def page_image_path(images_root, folder, page_number):
    return os.path.join(images_root, folder, f"page-{page_number}.png")


def _run_id():
    return utc_now_iso().replace("-", "").replace(":", "").replace(".", "")


def _page_output_dir(output_root, folder, page_number):
    return os.path.join(output_root, folder, f"page-{page_number:02d}")


def _build_page_record(*, source_batch, page_number, image_path, output_dir):
    return {
        "sourceBatch": source_batch,
        "pageNumber": page_number,
        "imagePath": image_path,
        "outputDir": output_dir,
        "status": "pending",
        "cataloguePath": "",
        "itemsUploaded": 0,
        "error": "",
    }


def _summarize_pages(pages):
    return {
        "totalPages": len(pages),
        "completedPages": sum(1 for page in pages if page.get("status") == "completed"),
        "failedPages": sum(1 for page in pages if page.get("status") == "failed"),
        "runningPages": sum(1 for page in pages if page.get("status") == "running"),
    }


def _write_progress(progress_path, payload):
    write_local_progress(progress_path, payload)


def build_initial_run_payload(*, plan, collection_name, images_root, output_root, run_id=None):
    run_id = run_id or _run_id()
    progress_path = os.path.join(output_root, "ingest_runs", f"{run_id}.json")

    pages = []
    page_jobs = []
    for source in plan["sources"]:
        for page_number in source["pages"]:
            image_path = page_image_path(images_root, source["folder"], page_number)
            page_output_dir = _page_output_dir(output_root, source["folder"], page_number)
            page_jobs.append(
                {
                    "source": source,
                    "pageNumber": page_number,
                    "imagePath": image_path,
                    "outputDir": page_output_dir,
                }
            )
            pages.append(
                _build_page_record(
                    source_batch=source["folder"],
                    page_number=page_number,
                    image_path=image_path,
                    output_dir=page_output_dir,
                )
            )

    run_payload = {
        "runId": run_id,
        "collection": collection_name,
        "imagesRoot": images_root,
        "outputRoot": output_root,
        "status": "running",
        "startedAt": utc_now_iso(),
        "updatedAt": utc_now_iso(),
        "sources": plan["sources"],
        "pages": pages,
        "summary": _summarize_pages(pages),
    }

    return progress_path, run_payload, page_jobs


def process_page_job(*, job, collection_name, args, first_upload):
    page_record = _build_page_record(
        source_batch=job["source"]["folder"],
        page_number=job["pageNumber"],
        image_path=job["imagePath"],
        output_dir=job["outputDir"],
    )
    page_record["status"] = "running"

    try:
        if not os.path.isfile(job["imagePath"]):
            raise FileNotFoundError(f"Image not found: {job['imagePath']}")

        result = run_cataloguer_for_image(
            image_path=job["imagePath"],
            output_dir=job["outputDir"],
            collection_name=collection_name,
        )

        coins = get_catalogue_entries(result["catalogue_data"])
        upload_result = None
        if args.upload and coins:
            upload_result = upload_to_firebase(
                coins,
                collection_name,
                source_page_path=job["imagePath"],
                clear_collection=(args.clear_first and first_upload),
            )
            if upload_result is None:
                raise RuntimeError("Upload to Firebase returned None.")
            first_upload = False

        page_record["status"] = "completed"
        page_record["cataloguePath"] = result["catalogue_path"]
        page_record["itemsUploaded"] = (
            upload_result["items_uploaded"]
            if upload_result
            else (len(coins) if args.upload else 0)
        )
        page_record["error"] = ""
    except Exception as exc:
        page_record["status"] = "failed"
        page_record["error"] = str(exc)

    return page_record, first_upload


def main():
    parser = argparse.ArgumentParser(description="Batch ingest independent-page coin folders")
    parser.add_argument(
        "--images-root",
        required=True,
        help="Root folder containing source page folders",
    )
    parser.add_argument(
        "--output-root",
        required=True,
        help="Root folder for per-page output and progress files",
    )
    parser.add_argument(
        "--collection",
        default="princely-states",
        help="Collection slug to ingest into",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload the resulting catalogue entries to Firebase",
    )
    parser.add_argument(
        "--clear-first",
        action="store_true",
        help="Clear the collection before the first upload only",
    )
    args = parser.parse_args()

    env_path = _find_env_path()
    load_dotenv(env_path)

    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY not set. Add it to backend/.env")
        sys.exit(1)

    images_root = os.path.abspath(args.images_root)
    output_root = os.path.abspath(args.output_root)
    os.makedirs(output_root, exist_ok=True)

    plan = build_princely_states_plan(images_root)
    collection_name = args.collection or plan["collection"]

    progress_path, run_payload, page_jobs = build_initial_run_payload(
        plan=plan,
        collection_name=collection_name,
        images_root=images_root,
        output_root=output_root,
    )

    _write_progress(progress_path, run_payload)

    first_upload = True
    for index, job in enumerate(page_jobs):
        page_record, first_upload = process_page_job(
            job=job,
            collection_name=collection_name,
            args=args,
            first_upload=first_upload,
        )
        run_payload["pages"][index] = page_record
        run_payload["updatedAt"] = utc_now_iso()
        run_payload["summary"] = _summarize_pages(run_payload["pages"])
        _write_progress(progress_path, run_payload)

        run_payload["updatedAt"] = utc_now_iso()
        run_payload["summary"] = _summarize_pages(run_payload["pages"])
        _write_progress(progress_path, run_payload)

    run_payload["status"] = (
        "completed"
        if run_payload["summary"]["failedPages"] == 0
        else "completed_with_errors"
    )
    run_payload["updatedAt"] = utc_now_iso()
    _write_progress(progress_path, run_payload)

    print(f"Run ID: {run_id}")
    print(f"Progress: {progress_path}")
    print(
        "Summary: "
        f"{run_payload['summary']['completedPages']} completed, "
        f"{run_payload['summary']['failedPages']} failed, "
        f"{run_payload['summary']['totalPages']} total"
    )


if __name__ == "__main__":
    main()
