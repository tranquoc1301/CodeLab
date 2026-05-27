export interface ErrorProfileTotals {
  recent_profiled_submissions: number;
  all_time_profiled_submissions: number;
  active_error_labels: number;
  active_topics: number;
}

export interface ErrorProfileTopicStat {
  slug: string;
  recent_count: number;
  all_time_count: number;
}

export interface ErrorProfileLabelStat {
  code: string;
  display_name: string;
  recent_count: number;
  all_time_count: number;
  recent_share: number;
  related_topics: ErrorProfileTopicStat[];
}

export interface ErrorProfileTopicCard {
  slug: string;
  recent_count: number;
  all_time_count: number;
  top_error_labels: ErrorProfileLabelStat[];
}

export interface ErrorProfileResponse {
  recent_window_days: number;
  generated_at: string;
  totals: ErrorProfileTotals;
  top_error_labels: ErrorProfileLabelStat[];
  top_topics: ErrorProfileTopicCard[];
}
