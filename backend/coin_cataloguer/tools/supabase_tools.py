import os
from supabase import create_client, Client
from ._tool_compat import tool

def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment variables")
    return create_client(url, key)

@tool("list_supabase_items")
def list_supabase_items(collection_slug: str = None, limit: int = 10, offset: int = 0):
    """Lists items from Supabase. Optionally filter by collection_slug."""
    supabase = get_supabase_client()
    query = supabase.table("items").select("*, collections!inner(slug)")
    if collection_slug:
        query = query.eq("collections.slug", collection_slug)
    
    result = query.range(offset, offset + limit - 1).execute()
    return result.data

@tool("get_item_details")
def get_item_details(item_id: str):
    """Gets full details for a specific item from Supabase, including its numismatic profile."""
    supabase = get_supabase_client()
    item = supabase.table("items").select("*").eq("id", item_id).single().execute()
    profile = supabase.table("numismatic_item_profiles").select("*").eq("item_id", item_id).single().execute()
    
    return {
        "item": item.data,
        "profile": profile.data
    }

@tool("update_item_metadata")
def update_item_metadata(item_id: str, updates: dict):
    """Updates an item's metadata in Supabase. 
    Updates can include fields in the 'items' table or the 'numismatic_item_profiles' table.
    Example updates: {"title": "New Title", "ruler_or_issuer": "New Ruler"}
    """
    supabase = get_supabase_client()
    
    item_fields = ["title", "subtitle", "description", "short_description", "era_label", "date_start", "date_end", "display_date"]
    profile_fields = ["material", "denomination", "weight_grams", "condition_label", "estimated_public_price_min", "estimated_public_price_max"]
    
    item_updates = {k: v for k, v in updates.items() if k in item_fields}
    profile_updates = {k: v for k, v in updates.items() if k in profile_fields}
    
    results = {}
    if item_updates:
        res = supabase.table("items").update(item_updates).eq("id", item_id).execute()
        results["items"] = res.data
        
    if profile_updates:
        res = supabase.table("numismatic_item_profiles").update(profile_updates).eq("id", item_id).execute()
        results["profile"] = res.data
        
    return results
