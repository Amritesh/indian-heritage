"""
Retry helpers for transient Gemini/HTTP transport failures.
"""

from __future__ import annotations

import threading
import time


_TRANSIENT_ERROR_MARKERS = (
    "connecterror",
    "connection reset",
    "unexpected eof while reading",
    "ssl",
    "timed out",
    "timeout",
    "temporarily unavailable",
    "service unavailable",
)


def is_transient_genai_error(error: Exception) -> bool:
    message = str(error).lower()
    error_type = type(error).__name__.lower()
    combined = f"{error_type} {message}"
    return any(marker in combined for marker in _TRANSIENT_ERROR_MARKERS)


def _run_with_timeout(callback, timeout_seconds: float | None):
    if timeout_seconds is None:
        return callback()

    result: dict[str, object] = {}

    def runner():
        try:
            result["value"] = callback()
        except Exception as error:  # pragma: no cover - passed through in caller tests
            result["error"] = error

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join(timeout_seconds)
    if thread.is_alive():
        raise TimeoutError(f"Gemini request timed out after {timeout_seconds} seconds")
    if "error" in result:
        raise result["error"]  # type: ignore[misc]
    return result.get("value")


def run_with_transient_retry(
    callback,
    *,
    attempts: int = 4,
    base_delay_seconds: float = 1.0,
    timeout_seconds: float | None = 45.0,
):
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return _run_with_timeout(callback, timeout_seconds)
        except Exception as error:  # pragma: no cover - concrete callers tested via smoke/unit
            last_error = error
            if attempt >= attempts or not is_transient_genai_error(error):
                raise
            time.sleep(base_delay_seconds * attempt)
    if last_error is not None:
        raise last_error
    raise RuntimeError("Transient retry helper exited without a result or error.")
