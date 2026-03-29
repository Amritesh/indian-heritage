"""
One-off script to upload an existing catalogue.json + coin images to Firebase.

Usage:
    python -m coin_cataloguer.upload_existing --catalogue /path/to/catalogue.json --collection "mughals-auto"
"""

import argparse
import json
import os
import sys

from dotenv import load_dotenv


def main():
    parser = argparse.ArgumentParser(description="Upload existing coin catalogue to Firebase")
    parser.add_argument("--catalogue", required=True, help="Path to catalogue.json")
    parser.add_argument("--collection", default="coin-catalogue", help="Collection name")
    args = parser.parse_args()

    # Load env
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(env_path)

    catalogue_path = os.path.abspath(args.catalogue)
    if not os.path.isfile(catalogue_path):
        print(f"Error: File not found: {catalogue_path}")
        sys.exit(1)

    with open(catalogue_path) as f:
        catalogue_data = json.load(f)

    # Handle both list and dict formats
    if isinstance(catalogue_data, list):
        coins = catalogue_data
    elif isinstance(catalogue_data, dict) and "catalogue" in catalogue_data:
        coins = catalogue_data["catalogue"]
    else:
        coins = [catalogue_data]

    print(f"Found {len(coins)} coins in catalogue")
    print(f"Collection name: {args.collection}")
    print()

    # Import upload function from main
    from .main import upload_to_firebase

    result = upload_to_firebase(coins, args.collection)
    if result:
        print()
        print("=" * 60)
        print(f"  Collection ID: {result['collection_id']}")
        print(f"  Items uploaded: {result['items_uploaded']}")
        print(f"  DB path: collections/{result['collection_id']}")
        print(f"  Details: collection_details/{result['collection_id']}")
        print("=" * 60)
    else:
        print("Upload failed. Check Firebase credentials.")


if __name__ == "__main__":
    main()
