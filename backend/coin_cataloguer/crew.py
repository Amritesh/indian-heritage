"""
CrewAI crew definition with two agents:
1. Image Cutter       - segments coins from a composite image
2. Numismatist Expert - identifies and catalogues each coin

Collection syncing is handled deterministically by the import/repair scripts and
the post-run upload flow in ``main.py``. Keeping sync out of the Crew avoids a
race where the agent tries to update collection stats before the local data file
exists for a new collection bootstrap.

Supabase is the metadata source of truth. Firebase Storage is used for media
assets and transitional compatibility payloads only.
"""

import json
import os

from crewai import Agent, Crew, LLM, Process, Task
from crewai_tools import SerperDevTool

from .tools.coin_analyzer import analyze_coin
from .tools.image_segmenter import create_tool as create_segment_tool


def _serper_search_enabled():
    if os.environ.get("DISABLE_SERPER_SEARCH", "").strip().lower() in {"1", "true", "yes", "on"}:
        return False
    return bool(os.environ.get("SERPER_API_KEY", "").strip())


def _build_catalogue_task_description(search_enabled: bool):
    if search_enabled:
        return (
            "For each cropped coin image from the segmentation step:\n\n"
            "1. Use the analyze_coin tool to get an initial visual identification.\n"
            "2. Use the SerperDevTool to search the web for additional details about the "
            "identified coin (e.g., search for 'Mughal Emperor Akbar silver rupee Agra mint "
            "value' or similar queries based on what you see).\n"
            "3. Cross-reference the visual analysis with web search results and the archive "
            "reference context from the source page, legends, mint marks, denomination, and "
            "collection context to produce the most accurate identification possible.\n"
            "4. Compile a complete catalogue entry for each coin.\n"
            "5. Keep the output consistent with the Supabase-backed archive pipeline: "
            "metadata is canonicalized into Supabase, while source images remain in Firebase Storage.\n\n"
            "6. If an item looks like a later user-uploaded photograph, dealer listing, mixed lot, "
            "or other non-archive source, say so explicitly in the notes and lower confidence "
            "instead of guessing.\n\n"
            "Process EVERY coin image. Do not skip any.\n\n"
            "Your final output must be a valid JSON array where each element has these fields:\n"
            "- image_path, ruler_or_issuer, year_or_period, mint_or_place, denomination,\n"
            "  series_or_catalog, material, condition, obverse_description, reverse_description,\n"
            "  weight_estimate, estimated_price_inr, notes, confidence"
        )

    return (
        "For each cropped coin image from the segmentation step:\n\n"
        "1. Use the analyze_coin tool to get an initial visual identification.\n"
        "2. Refine that identification from the visible legends, symbols, denomination, "
        "historical context in the image itself, and the archive reference context that "
        "comes from the source page or collection batch.\n"
        "3. Compile a complete catalogue entry for each coin.\n"
        "4. Keep the output consistent with the Supabase-backed archive pipeline: "
        "metadata is canonicalized into Supabase, while source images remain in Firebase Storage.\n\n"
        "5. If an item looks like a later user-uploaded photograph, dealer listing, mixed lot, "
        "or other non-archive source, say so explicitly in the notes and lower confidence "
        "instead of guessing.\n\n"
        "Process EVERY coin image. Do not skip any.\n\n"
        "Your final output must be a valid JSON array where each element has these fields:\n"
        "- image_path, ruler_or_issuer, year_or_period, mint_or_place, denomination,\n"
        "  series_or_catalog, material, condition, obverse_description, reverse_description,\n"
        "  weight_estimate, estimated_price_inr, notes, confidence"
    )


def create_crew(image_path: str, output_dir: str, collection_name: str = "coin-catalogue"):
    """Build and return the coin cataloguing crew."""

    # --- LLM (Gemini via OpenAI-compatible endpoint) ---
    # Using Google's OpenAI-compatible API avoids google-genai SDK's strict
    # FunctionDeclaration schema validation that rejects additionalProperties/title.
    gemini_llm = LLM(
        model="gemini-flash-latest",
        api_key=os.environ.get("GEMINI_API_KEY"),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    # --- Tools ---
    segment_tool = create_segment_tool(output_dir=output_dir)
    analyze_tool = analyze_coin
    search_enabled = _serper_search_enabled()
    search_tool = SerperDevTool() if search_enabled else None

    # --- Agent 1: Image Cutter ---
    image_cutter = Agent(
        role="Coin Image Segmentation Specialist",
        goal=(
            "Accurately detect and extract every individual coin from a composite image "
            "containing multiple Indian coins. Save each coin as a separate high-quality image."
        ),
        backstory=(
            "You are an expert in numismatic image processing with years of experience "
            "handling Indian coin collections. You have a keen eye for identifying individual "
            "coins even when they are close together, overlapping, or on varied backgrounds. "
            "You use advanced vision AI to detect precise bounding boxes and crop each coin cleanly."
        ),
        tools=[segment_tool],
        llm=gemini_llm,
        verbose=True,
        allow_delegation=False,
    )

    # --- Agent 2: Numismatist Expert ---
    numismatist = Agent(
        role="Expert Indian Numismatist",
        goal=(
            "Identify and catalogue each coin with comprehensive metadata including ruler, "
            "year, mint, denomination, material, condition, estimated price, and detailed "
            "descriptions of both obverse and reverse sides."
        ),
        backstory=(
            "You are Dr. Rajesh Sharma, one of India's most renowned numismatists with over "
            "30 years of experience. You have authored multiple books on Indian coinage from "
            "the punch-marked coins of the Mauryan Empire to modern Republic of India issues. "
            "You are equally versed in Sultanate, Mughal, Maratha, British India, and Princely "
            "States coinages. You can identify coins by their legends (Devanagari, Persian, "
            "English), portraits, symbols, and mint marks. You also know current market values "
            "and have access to online numismatic databases for cross-referencing. You work from "
            "archive reference context, so be careful to distinguish true archival source material "
            "from later user-uploaded images, dealer photos, or mixed lots."
        ),
        tools=[tool for tool in [analyze_tool, search_tool] if tool is not None],
        llm=gemini_llm,
        verbose=True,
        allow_delegation=False,
    )

    # --- Task 1: Segment the image ---
    segment_task = Task(
        description=(
            f"Analyze the composite coin image at: {image_path}\n\n"
            "Use the segment_coins tool to detect all individual coins in this image "
            "and save each one as a separate PNG file. Report the total number of coins "
            "found and the file path of each cropped coin image."
        ),
        expected_output=(
            "A JSON object containing:\n"
            "- total_coins_detected: number of coins found\n"
            "- output_directory: path where cropped images are saved\n"
            "- coins: list of objects with index, path, label, and bbox for each coin"
        ),
        agent=image_cutter,
    )

    # --- Task 2: Catalogue each coin ---
    catalogue_task = Task(
        description=_build_catalogue_task_description(search_enabled),
        expected_output=(
            "A valid JSON array of coin catalogue entries. Each entry must have all metadata "
            "fields filled in. Example:\n"
            '[{"image_path": "/path/to/coin_1.png", "ruler_or_issuer": "Akbar", ...}]'
        ),
        agent=numismatist,
        context=[segment_task],
    )

    tasks = [segment_task, catalogue_task]

    # --- Crew ---
    crew = Crew(
        agents=[image_cutter, numismatist],
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
    )

    return crew
