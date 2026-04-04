from coin_cataloguer import crew


def test_catalogue_task_mentions_supabase_archive_pipeline():
    description = crew._build_catalogue_task_description(False)

    assert "Supabase" in description
    assert "Firebase Storage" in description
