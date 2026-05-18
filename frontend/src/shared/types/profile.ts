export interface ErrorProfileTotals {
  recent_profiled_submissions: number;
  lifetime_profiled_submissions: number;
}

export interface ErrorProfileChartItem {
  code: string;
  display_name: string;
  recent_count: number;
  lifetime_count: number;
}

export interface ErrorProfileChart {
  labels: ErrorProfileChartItem[];
}

export interface ErrorProfileTopicStat {
  slug: string;
  count: number;
}

export interface ErrorProfileDetailStat {
  code: string;
  display_name: string;
}

export interface ErrorLabelProfileCard {
  code: string;
  display_name: string;
  recent_count: number;
  lifetime_count: number;
  recent_share: number;
  trend_delta: number;
  top_topics: ErrorProfileTopicStat[];
  top_detail: ErrorProfileDetailStat;
  practice_focus: string;
}

export interface ErrorProfileResponse {
  recent_window_days: number;
  generated_at: string;
  totals: ErrorProfileTotals;
  chart: ErrorProfileChart;
  top_labels: ErrorLabelProfileCard[];
}
