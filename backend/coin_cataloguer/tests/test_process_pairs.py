from coin_cataloguer import process_pairs


def test_parse_pairs_accepts_paired_and_single_pages():
    assert process_pairs._parse_pairs("5:6,14,16:17") == [
        (5, 6),
        (14, None),
        (16, 17),
    ]


def test_pair_output_dir_handles_single_page():
    assert process_pairs._pair_output_dir("/tmp/album", 14, None) == "/tmp/album/paired_output/page-14"


def test_pair_output_dir_handles_page_pair():
    assert process_pairs._pair_output_dir("/tmp/album", 5, 6) == "/tmp/album/paired_output/page-05-06"
