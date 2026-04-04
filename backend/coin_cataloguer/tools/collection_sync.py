"""
CrewAI tool that syncs a collection's aggregated stats to Firestore after new items
have been uploaded via the cataloguer. Updates itemCount, filterableMaterials,
estimatedWorth, sortYear, and estimatedPriceAvg on the Firestore collections document.
"""

import json
import os
import re
import subprocess
import sys

from ._tool_compat import tool


def _project_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def _find_node() -> str:
    """Return the path to the node binary."""
    for candidate in ("node", "/usr/local/bin/node", "/usr/bin/node"):
        result = subprocess.run(
            ["which", candidate] if candidate == "node" else ["test", "-x", candidate],
            capture_output=True,
        )
        if result.returncode == 0:
            return candidate
    return "node"


@tool("sync_collection_stats")
def sync_collection_stats(collection_name: str) -> str:
    """Syncs a collection's aggregated stats to Firestore after new items have been
    uploaded. Updates itemCount, filterableMaterials, estimatedWorth, sortYear, and
    estimatedPriceAvg. Call this as the final step after uploading new coins.
    Input: the collection slug, e.g. 'mughals' or 'british'."""

    slug = collection_name.strip().lower()
    if not re.match(r"^[a-z0-9-]+$", slug):
        return f"Error: Invalid collection slug '{slug}'. Use only lowercase letters, digits, and hyphens."

    project_root = _project_root()
    script = os.path.join(project_root, "backend", "scripts", "importToFirestore.js")

    if not os.path.isfile(script):
        return f"Error: importToFirestore.js not found at {script}"

    data_file = os.path.join(project_root, "temp", "data", f"{slug}.json")
    if not os.path.isfile(data_file):
        return (
            f"Error: No local data file found at {data_file}. "
            "Run the upload step first so the data file is present."
        )

    node = _find_node()
    result = subprocess.run(
        [node, script, "--collection", slug],
        capture_output=True,
        text=True,
        cwd=project_root,
    )

    if result.returncode != 0:
        return f"Error syncing '{slug}' stats:\n{result.stderr.strip()}"

    output = result.stdout.strip()

    # Try to parse summary line counts from the output
    items_match = re.search(r"(\d+) items (found|written)", output)
    summary = f"Collection '{slug}' stats synced to Firestore."
    if items_match:
        summary += f" {items_match.group(1)} items processed."

    return f"{summary}\n\n{output}"
