
export const rawSnapshots = [
  {
    "input": {
      "session_date": "2025-12-31",
      "current_et_time": "09:30",
      "premarket": {
        "asia_high": 22310.75,
        "asia_low": 22033.75,
        "london_high": 22336.5,
        "london_low": 22230.0,
        "london_range": 106.5,
        "overnight_high": 22402.5,
        "overnight_low": 22247.0,
        "overnight_range": 155.5,
        "previous_day_high": 22436.75,
        "previous_day_low": 22094.0,
        "previous_week_high": 23023.25,
        "previous_week_low": 22094.0,
        "compression_flag": false,
        "compression_ratio": 0.685,
        "smt_preopen": "neutral"
      },
      "intraday": {
        "ib": {
            "ib_status": "complete",
            "ib_high": 22356.0,
            "ib_low": 22078.5,
            "ib_range": 277.5,
            "ib_mid": 22217.25,
            "price_vs_ib": "lower_third_hug",
            "price_vs_vwap": "below",
            "current_close": 22100.0,
            "current_open": 22200.0,
            "current_high": 22356.0,
            "current_low": 22078.5,
            "current_volume": 5000,
            "current_vwap": 22220.0,
            "ema20": 22141.48,
            "ema50": 22202.51,
            "ema200": 22254.49,
            "rsi14": 27.17,
            "atr14": 57.26,
            "note": "..."
        },
        "wick_parade": {
            "bullish_wick_parade_count": 3,
            "bearish_wick_parade_count": 8,
            "window_minutes": 60,
            "note": "Counts in last 60 min – ≥6 bullish = long override (Rule #14), ≥6 bearish = short override"
        },
        "dpoc_migration": {
            "dpoc_slices": [
                {
                    "time": "00:00",
                    "dpoc": 22262.5
                }
            ],
            "migration_direction": "down",
            "steps_since_1030": -244.25,
            "note": "..."
        },
        "volume_profile": {
            "current_session": {
                "poc": 22088.25,
                "vah": 22330.75,
                "val": 21961.25,
                "high": 22356.0,
                "low": 21934.25,
                "hvn_nodes": [22088.25, 22179.0],
                "lvn_nodes": [21934.0, 21934.25, 21934.5]
            },
            "previous_day": {
                "poc": 22088.25,
                "vah": 22332.5,
                "val": 21909.5,
                "high": 22402.5,
                "low": 21895.75,
                "hvn_nodes": [22088.25, 22179.0, 22020.75],
                "lvn_nodes": [21895.5, 21895.75, 21896.0]
            },
            "previous_3_days": {
                "poc": 22132.5,
                "vah": 22471.25,
                "val": 21909.5,
                "high": 22654.75,
                "low": 21895.75,
                "hvn_nodes": [22132.5, 22322.25, 22088.25],
                "lvn_nodes": [21895.5, 21895.75, 21896.0]
            },
            "note": "Volume profile (70% value area) + top HVN/LVN nodes. Current = up to snapshot time (no lookahead)"
        },
        "tpo_profile": {
            "current_poc": 22204.75,
            "current_vah": 22269.5,
            "current_val": 22117.25,
            "single_prints_above_vah": 8,
            "single_prints_below_val": 351,
            "poor_high": 0,
            "poor_low": 0,
            "fattening_zone": "below_val",
            "tpo_shape": "p_shape",
            "note": "Compact TPO facts for ROCKIT"
        },
        "ninety_min_pd_arrays": {
          "ninety_min_high": 22350.75,
          "ninety_min_low": 22330.5,
          "equilibrium_50": 22340.62,
          "current_in_discount": 1,
          "current_in_premium": 0,
          "expansion_status": "inside",
          "bias_potential": "bullish"
        },
        "fvg_detection": {
          "daily_fvg": [],
          "4h_fvg": [],
          "1h_fvg": [
            { "type": "bullish", "top": 22330.5, "bottom": 22284.0, "time": "2025-12-31 09:00" }
          ],
          "90min_fvg": [],
          "15min_fvg": [],
          "5min_fvg": []
        }
      },
      "core_confluences": {
        "ib_acceptance": {
            "close_above_ibh": false,
            "close_below_ibl": false,
            "price_accepted_higher": "No",
            "price_accepted_lower": "No"
        },
        "dpoc_vs_ib": {
            "dpoc_above_ibh": false,
            "dpoc_below_ibl": false,
            "dpoc_extreme_shift": "none"
        },
        "dpoc_compression": {
            "compressing_against_vah": false,
            "compressing_against_val": false,
            "compression_bias": "none"
        },
        "price_location": {
            "in_upper_third": false,
            "in_lower_third": false,
            "in_middle": true,
            "location_label": "middle"
        },
        "tpo_signals": {
            "single_prints_above": true,
            "single_prints_below": true,
            "fattening_upper": false,
            "fattening_lower": true
        },
        "migration": {
            "significant_up": false,
            "significant_down": true,
            "net_direction": "down",
            "pts_since_1030": -59.5
        },
        "note": "Precomputed confluences – use these for bias logic, quote raw values from intraday"
      }
    },
    "output": "```json\n{\n  \"day_type\": {\"type\": \"Trend Up\", \"timestamp\": \"2025-12-31 / 09:30\"},\n  \"bias\": \"LONG\",\n  \"liquidity_sweeps\": {\"asia\": {\"status\": \"Held\", \"strength\": \"None\"}, \"ib\": {\"status\": \"Reclaimed\", \"strength\": \"Engulfed\"}},\n  \"value_acceptance\": \"VA [skewed up] | POC location [mid] | Acceptance above VAH\",\n  \"tpo_read\": {\"profile_signals\": \"Upper fattening\", \"dpoc_migration\": \"DPOC migration [up] X 77.0 pts\", \"extreme_or_compression\": \"extreme bullish shift\"},\n  \"confidence\": \"93%\",\n  \"day_type_reasoning\": [\"IB complete with upper hug\", \"DPOC migrated 77 points upper\", \"Lack of bearish signals\"],\n  \"one_liner\": \"IB upper reclaim + DPOC upper migration = aggressive bullish trend\"\n}\n```"
  },
  {
    "input": {
      "session_date": "2025-12-31",
      "current_et_time": "09:45",
      "premarket": {
        "asia_high": 22310.75,
        "asia_low": 22033.75,
        "london_high": 22336.5,
        "london_low": 22230.0,
        "london_range": 106.5,
        "overnight_high": 22402.5,
        "overnight_low": 22247.0,
        "overnight_range": 155.5,
        "previous_day_high": 22436.75,
        "previous_day_low": 22094.0,
        "previous_week_high": 23023.25,
        "previous_week_low": 22094.0,
        "compression_flag": false,
        "compression_ratio": 0.685,
        "smt_preopen": "neutral"
      },
      "intraday": {
        "ib": {
          "ib_status": "complete",
          "ib_high": 22350.75,
          "ib_low": 22261.25,
          "ib_range": 89.5,
          "ib_mid": 22306.0,
          "price_vs_ib": "lower_third_hug",
          "price_vs_vwap": "below",
          "current_close": 22272.0,
          "current_open": 22283.0,
          "current_high": 22284.75,
          "current_low": 22261.25,
          "current_volume": 6486,
          "current_vwap": 22285.88,
          "ema20": 22313.97,
          "ema50": 22291.12,
          "ema200": 22284.24,
          "rsi14": 34.4,
          "atr14": 18.68
        },
        "wick_parade": {
          "bullish_wick_parade_count": 4,
          "bearish_wick_parade_count": 8
        },
        "dpoc_migration": {
          "dpoc_slices": [
            { "time": "09:30", "dpoc": 22330.5 },
            { "time": "09:45", "dpoc": 22282.0 }
          ],
          "migration_direction": "up",
          "steps_since_1030": 28.5,
          "note": "DPOC migration = final arbiter for bias"
        },
        "volume_profile": {
            "current_session": {
                "poc": 22088.25,
                "vah": 22330.75,
                "val": 21961.25,
                "high": 22356.0,
                "low": 21934.25,
                "hvn_nodes": [22088.25, 22179.0],
                "lvn_nodes": [21934.0, 21934.25, 21934.5]
            },
            "previous_day": {
                "poc": 22088.25,
                "vah": 22332.5,
                "val": 21909.5,
                "high": 22402.5,
                "low": 21895.75,
                "hvn_nodes": [22088.25, 22179.0, 22020.75],
                "lvn_nodes": [21895.5, 21895.75, 21896.0]
            },
            "previous_3_days": {
                "poc": 22132.5,
                "vah": 22471.25,
                "val": 21909.5,
                "high": 22654.75,
                "low": 21895.75,
                "hvn_nodes": [22132.5, 22322.25, 22088.25],
                "lvn_nodes": [21895.5, 21895.75, 21896.0]
            },
            "note": "Volume profile (70% value area) + top HVN/LVN nodes. Current = up to snapshot time (no lookahead)"
        },
        "tpo_profile": {
            "current_poc": 22204.75,
            "current_vah": 22269.5,
            "current_val": 22117.25,
            "single_prints_above_vah": 8,
            "single_prints_below_val": 351,
            "poor_high": 0,
            "poor_low": 0,
            "fattening_zone": "below_val",
            "tpo_shape": "p_shape",
            "note": "Compact TPO facts for ROCKIT"
        },
        "ninety_min_pd_arrays": {
          "ninety_min_high": 22350.75,
          "ninety_min_low": 22261.25,
          "equilibrium_50": 22306.0,
          "current_in_discount": 1,
          "current_in_premium": 0,
          "expansion_status": "inside",
          "bias_potential": "bullish"
        },
        "fvg_detection": {
          "daily_fvg": [],
          "4h_fvg": [],
          "1h_fvg": [],
          "90min_fvg": [],
          "15min_fvg": [
            { "type": "bearish", "top": 22345.75, "bottom": 22284.75, "time": "2025-12-31 09:45" }
          ],
          "5min_fvg": []
        }
      },
      "core_confluences": {
        "ib_acceptance": {
          "close_above_ibh": false,
          "close_below_ibl": false,
          "price_accepted_higher": "No",
          "price_accepted_lower": "No"
        },
        "dpoc_vs_ib": {
          "dpoc_above_ibh": false,
          "dpoc_below_ibl": false,
          "dpoc_extreme_shift": "none"
        },
        "dpoc_compression": {
          "compressing_against_vah": true,
          "compressing_against_val": false,
          "compression_bias": "aggressive_bullish"
        },
        "price_location": {
          "location_label": "lower_third_hug"
        },
        "tpo_signals": {
          "single_prints_above": false,
          "single_prints_below": false,
          "fattening_upper": false,
          "fattening_lower": false
        },
        "migration": {
          "significant_up": true,
          "significant_down": false,
          "net_direction": "up",
          "pts_since_1030": 28.5
        }
      }
    },
    "output": "```json\n{\n  \"day_type\": {\"type\": \"Trend Down\", \"timestamp\": \"2025-12-31 / 09:45\"},\n  \"bias\": \"Short\",\n  \"liquidity_sweeps\": {\"asia\": {\"status\": \"Reclaimed\", \"strength\": \"Engulfed\"}, \"ib\": {\"status\": \"Reclaimed\", \"strength\": \"Engulfed\"}},\n  \"value_acceptance\": \"POC location [low] | compressing against VAL (bearish)\",\n  \"tpo_read\": {\"profile_signals\": \"Compressing against VAL (bearish)\", \"dpoc_migration\": \"DPOC migration [up] X 28.5 pts\", \"extreme_or_compression\": \"compressing against VAL (bearish)\"},\n  \"confidence\": \"78%\",\n  \"day_type_reasoning\": [\"DPOC compressing against VAL\", \"IB lower third hug\", \"TPO Fattening at VAL\"],\n  \"one_liner\": \"Short trap – DPOC compressing against VAL + minor upper hug + early bullish parade\"\n}\n```"
  }
];
