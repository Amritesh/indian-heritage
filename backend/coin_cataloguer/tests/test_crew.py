from coin_cataloguer import crew


def test_search_is_disabled_without_serper_key(monkeypatch):
    monkeypatch.delenv("SERPER_API_KEY", raising=False)

    assert crew._serper_search_enabled() is False
    assert "SerperDevTool" not in crew._build_catalogue_task_description(False)


def test_search_is_enabled_with_serper_key(monkeypatch):
    monkeypatch.setenv("SERPER_API_KEY", "test-key")

    assert crew._serper_search_enabled() is True
    assert "SerperDevTool" in crew._build_catalogue_task_description(True)


def test_search_can_be_disabled_even_when_serper_key_exists(monkeypatch):
    monkeypatch.setenv("SERPER_API_KEY", "test-key")
    monkeypatch.setenv("DISABLE_SERPER_SEARCH", "1")

    assert crew._serper_search_enabled() is False
    assert "SerperDevTool" not in crew._build_catalogue_task_description(False)
