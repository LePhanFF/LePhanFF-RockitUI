
export interface DPOCSlice {
  time: string;
  dpoc: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  vwap?: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
}

export interface FVG {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  time: string;
}

export interface MarketSnapshot {
  input: {
    session_date: string;
    current_et_time: string;
    premarket: {
      asia_high: number;
      asia_low: number;
      london_high: number;
      london_low: number;
      london_range: number;
      overnight_high: number;
      overnight_low: number;
      overnight_range: number;
      previous_day_high: number;
      previous_day_low: number;
      previous_week_high: number;
      previous_week_low: number;
      compression_flag: boolean;
      compression_ratio: number;
      smt_preopen: string;
    };
    intraday: {
      ib: {
        ib_status: string;
        ib_high: number;
        ib_low: number;
        ib_range: number;
        ib_mid: number;
        price_vs_ib: string;
        price_vs_vwap: string;
        current_close: number;
        current_open: number;
        current_high: number;
        current_low: number;
        current_volume: number;
        current_vwap: number;
        ema20: number;
        ema50: number;
        ema200: number;
        rsi14: number;
        atr14: number;
        note?: string;
      };
      wick_parade: {
        bullish_wick_parade_count: number;
        bearish_wick_parade_count: number;
        window_minutes?: number;
        note?: string;
      };
      dpoc_migration: {
        dpoc_slices: DPOCSlice[];
        migration_direction: string;
        steps_since_1030: number;
        note: string;
      };
      volume_profile: {
        current_session: ProfileSet;
        previous_day: ProfileSet;
        previous_3_days: ProfileSet;
      };
      tpo_profile: {
        current_poc: number;
        current_vah: number;
        current_val: number;
        single_prints_above_vah: number;
        single_prints_below_val: number;
        tpo_shape: string;
        fattening_zone: string;
      };
      ninety_min_pd_arrays: {
        ninety_min_high: number;
        ninety_min_low: number;
        equilibrium_50: number;
        bias_potential: string;
        expansion_status: string;
      };
      fvg_detection: {
        daily_fvg: FVG[];
        "4h_fvg": FVG[];
        "1h_fvg": FVG[];
        "90min_fvg": FVG[];
        "15min_fvg": FVG[];
        "5min_fvg": FVG[];
      };
    };
    core_confluences: {
      ib_acceptance: {
        close_above_ibh: boolean;
        close_below_ibl: boolean;
        price_accepted_higher: string;
        price_accepted_lower: string;
      };
      dpoc_compression: {
        compressing_against_vah: boolean;
        compressing_against_val: boolean;
        compression_bias: string;
      };
      price_location: {
        location_label: string;
      };
    };
    output: string;
  };
}

export interface ProfileSet {
  poc: number;
  vah: number;
  val: number;
  high: number;
  low: number;
  hvn_nodes: number[];
  lvn_nodes: number[];
}

export interface DecodedOutput {
  day_type: {
    type: string;
    timestamp: string;
  };
  bias: string;
  liquidity_sweeps: Record<string, { status: string; strength: string }>;
  value_acceptance: string;
  tpo_read: {
    profile_signals: string;
    dpoc_migration: string;
    extreme_or_compression: string;
  };
  confidence: string;
  day_type_reasoning: string[];
  one_liner: string;
  thinking?: string;
}
