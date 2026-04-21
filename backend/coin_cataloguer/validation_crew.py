import os
from crewai import Agent, Crew, LLM, Process, Task
from .tools.supabase_tools import list_supabase_items, get_item_details, update_item_metadata

def create_validation_crew():
    """Build and return the data validation and correction crew."""

    gemini_llm = LLM(
        model="gemini-flash-latest",
        api_key=os.environ.get("GEMINI_API_KEY"),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    # --- Agent 1: Data Auditor ---
    auditor = Agent(
        role="Senior Numismatic Auditor",
        goal=(
            "Scan the Supabase archive for inconsistencies in coin metadata. "
            "Verify that rulers, dates, mints, and denominations are historically accurate "
            "and consistent within the collection."
        ),
        backstory=(
            "You are a meticulous numismatic auditor with a PhD in Ancient Indian History. "
            "You have a deep understanding of chronology and regional variations in Indian coinage. "
            "Your job is to identify errors introduced during AI-driven data ingestion, "
            "such as impossible date ranges for a ruler, misidentified mints, or illogical "
            "denominations."
        ),
        tools=[list_supabase_items, get_item_details],
        llm=gemini_llm,
        verbose=True,
        allow_delegation=False,
    )

    # --- Agent 2: Data Correction Specialist ---
    corrector = Agent(
        role="Numismatic Data Specialist",
        goal=(
            "Correct confirmed errors in the Supabase archive using the update_item_metadata tool. "
            "Ensure that all corrections are historically accurate and follow the canonical "
            "naming conventions of the archive."
        ),
        backstory=(
            "You are an expert in managing archival databases. You work closely with the Auditor "
            "to apply fixes to the data. You are careful to preserve the integrity of the archive "
            "and only make changes that have been verified."
        ),
        tools=[update_item_metadata],
        llm=gemini_llm,
        verbose=True,
        allow_delegation=False,
    )

    # --- Task 1: Audit Data ---
    audit_task = Task(
        description=(
            "1. List the most recent items from the Supabase archive.\n"
            "2. For each item, review its metadata (ruler, period, mint, denomination).\n"
            "3. Identify any records that seem suspicious or historically inaccurate.\n"
            "4. For suspicious records, get full details to confirm the error.\n"
            "5. Compile a list of specific corrections needed."
        ),
        expected_output=(
            "A list of items requiring correction, including their IDs and the specific fields "
            "that need to be updated with the correct historical values."
        ),
        agent=auditor,
    )

    # --- Task 2: Apply Corrections ---
    correction_task = Task(
        description=(
            "Using the list of corrections provided by the Auditor:\n"
            "1. Apply each correction to the Supabase archive using the update_item_metadata tool.\n"
            "2. Verify that each update was successful."
        ),
        expected_output=(
            "A summary of all items corrected, including the fields that were updated."
        ),
        agent=corrector,
        context=[audit_task],
    )

    return Crew(
        agents=[auditor, corrector],
        tasks=[audit_task, correction_task],
        process=Process.sequential,
        verbose=True,
    )
