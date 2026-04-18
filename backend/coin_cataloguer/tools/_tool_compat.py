"""Compatibility wrapper for CrewAI tools.

These ingest scripts should still run in environments where CrewAI is not
installed, so we provide a small fallback decorator that mimics the parts of the
tool interface our code relies on: ``.run`` and ``.func``.
"""

from __future__ import annotations

from typing import Any, Callable

try:  # pragma: no cover - exercised implicitly when crewai is installed
    from crewai.tools import tool as _crewai_tool
except ModuleNotFoundError:  # pragma: no cover - fallback path covered indirectly
    _crewai_tool = None


def tool(name: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    if _crewai_tool is not None:
        return _crewai_tool(name)

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        def run(*args: Any, **kwargs: Any) -> Any:
            return fn(*args, **kwargs)

        setattr(fn, "tool_name", name)
        setattr(fn, "run", run)
        setattr(fn, "func", fn)
        return fn

    return decorator
