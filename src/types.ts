// 回顧録 — データモデル(Supabase移行を見据えたスキーマ)

export type BetType = 'bet' | 'pass';
export type PredictionStatus = 'predicted' | 'awaiting_result' | 'verified';

export interface Prediction {
  id: string; // uuid
  race_name: string;
  race_date: string; // YYYY-MM-DD
  venue: string;
  pace_hypothesis: string;
  track_bias_hypothesis: string;
  pick_rationale: string;
  concerns: string;
  bet_type: BetType;
  bet_detail: string;
  confidence: number | null; // 1-5
  status: PredictionStatus;
  created_at: string; // ISO
  updated_at: string; // ISO
  // Phase 2 以降: result_text, verdict(JSON) を追加予定
}

export const VENUES = [
  '東京', '中山', '阪神', '京都', '中京', '新潟', '福島', '小倉', '札幌', '函館', '地方', 'その他',
] as const;

export const STATUS_LABEL: Record<PredictionStatus, string> = {
  predicted: '予想済',
  awaiting_result: '結果待ち',
  verified: '検証済',
};
