import unittest

from coin_cataloguer.price_validation import (
    assess_price_validation,
    compute_intrinsic_metal_value_inr,
)


class PriceValidationTests(unittest.TestCase):
    def test_gold_coin_below_metal_floor_is_flagged(self):
        metal_value = compute_intrinsic_metal_value_inr(
            materials=["Gold"],
            weight_text="11.0 g",
            gold_24k_inr_per_gram=15000,
            silver_999_inr_per_gram=150,
        )

        result = assess_price_validation(
            materials=["Gold"],
            weight_text="11.0 g",
            estimated_price_text="75,000 - 90,000",
            gold_24k_inr_per_gram=15000,
            silver_999_inr_per_gram=150,
        )

        self.assertEqual(metal_value, 165000)
        self.assertEqual(result["status"], "below_metal_floor")
        self.assertIn("below_metal_floor", result["flags"])
        self.assertEqual(result["metal_value_inr"], 165000)

    def test_quaternary_silver_uses_declared_purity(self):
        metal_value = compute_intrinsic_metal_value_inr(
            materials=["Quaternary Silver (0.500)"],
            weight_text="11.66 g",
            gold_24k_inr_per_gram=15000,
            silver_999_inr_per_gram=150,
        )

        self.assertEqual(metal_value, 875)

    def test_copper_coin_without_metal_floor_stays_unflagged(self):
        result = assess_price_validation(
            materials=["Copper"],
            weight_text="10 g",
            estimated_price_text="500 - 900",
            gold_24k_inr_per_gram=15000,
            silver_999_inr_per_gram=150,
        )

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["metal_value_inr"], 0)
        self.assertEqual(result["flags"], [])


if __name__ == "__main__":
    unittest.main()
