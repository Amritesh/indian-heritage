from coin_cataloguer.batch_ingest import build_princely_states_plan


def test_build_princely_states_plan_uses_expected_page_ranges():
    plan = build_princely_states_plan("/repo/temp/images")

    assert plan["collection"] == "princely-states"
    assert plan["sources"][0]["folder"] == "princeley-states-1-1"
    assert plan["sources"][0]["pages"] == list(range(5, 17))
    assert plan["sources"][1]["folder"] == "indian-princely-states-2-2"
    assert plan["sources"][1]["pages"] == list(range(4, 21))
