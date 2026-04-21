import os
import argparse
from dotenv import load_dotenv
from .validation_crew import create_validation_crew

def _find_env_path():
    current = os.path.abspath(os.path.dirname(__file__))
    while True:
        if os.path.basename(current) == "backend":
            candidate = os.path.join(current, ".env")
            if os.path.isfile(candidate):
                return candidate
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return os.path.join(os.path.dirname(__file__), "..", ".env")

def main():
    parser = argparse.ArgumentParser(description="Run the Data Validation Crew")
    parser.add_argument("--collection", help="Optional collection slug to focus on")
    args = parser.parse_args()

    env_path = _find_env_path()
    load_dotenv(env_path)

    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY not set.")
        return

    print("=" * 60)
    print("  DATA VALIDATION CREW")
    print("=" * 60)
    
    crew = create_validation_crew()
    result = crew.kickoff()

    print("\n" + "=" * 60)
    print("  VALIDATION COMPLETE")
    print("=" * 60)
    print(result)

if __name__ == "__main__":
    main()
