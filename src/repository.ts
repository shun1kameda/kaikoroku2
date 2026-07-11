// repository層 — データアクセスをここに隔離する。
// Phase 1:   IndexedDB(Dexie)実装(localRepository)。
// Phase 1.5: Supabase 実装(supabaseRepository)を追加。
//            ログイン時は Supabase・未ログイン時はローカルを使う。
//            呼び出し側は `repo`(デリゲート)だけを見るので変更不要。

import Dexie, { type Table } from 'dexie';
import type { Prediction } from './types';
import { supabase } from './supabaseClient';

export interface PredictionRepository {
  list(): Promise<Prediction[]>;
  get(id: string): Promise<Prediction | undefined>;
  create(p: Omit<Prediction, 'id' | 'created_at' | 'updated_at'>): Promise<Prediction>;
  update(id: string, patch: Partial<Prediction>): Promise<void>;
  remove(id: string): Promise<void>;
}

/* ---------------- Local(IndexedDB / Dexie)---------------- */

class KaikorokuDB extends Dexie {
  predictions!: Table<Prediction, string>;
  constructor() {
    super('kaikoroku');
    this.version(1).stores({
      // インデックス: id(主キー), race_date, status, created_at
      predictions: 'id, race_date, status, created_at',
    });
  }
}

const db = new KaikorokuDB();

function uuid(): string {
  return crypto.randomUUID();
}

export const localRepository: PredictionRepository = {
  async list() {
    // 新しい順
    return db.predictions.orderBy('created_at').reverse().toArray();
  },
  async get(id) {
    return db.predictions.get(id);
  },
  async create(p) {
    const now = new Date().toISOString();
    const record: Prediction = { ...p, id: uuid(), created_at: now, updated_at: now };
    await db.predictions.add(record);
    return record;
  },
  async update(id, patch) {
    await db.predictions.update(id, { ...patch, updated_at: new Date().toISOString() });
  },
  async remove(id) {
    await db.predictions.delete(id);
  },
};

/* ---------------- Supabase ---------------- */

// DB行 → Prediction(DBには user_id が付くが、アプリ型は user_id を持たないので落とす)
function rowToPrediction(r: Record<string, unknown>): Prediction {
  return {
    id: r.id as string,
    race_name: r.race_name as string,
    race_date: r.race_date as string,
    venue: r.venue as string,
    pace_hypothesis: r.pace_hypothesis as string,
    track_bias_hypothesis: r.track_bias_hypothesis as string,
    pick_rationale: r.pick_rationale as string,
    concerns: r.concerns as string,
    bet_type: r.bet_type as Prediction['bet_type'],
    bet_detail: r.bet_detail as string,
    confidence: (r.confidence as number | null) ?? null,
    status: r.status as Prediction['status'],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase が設定されていません');
  return supabase;
}

export const supabaseRepository: PredictionRepository = {
  async list() {
    const { data, error } = await requireSupabase()
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToPrediction);
  },
  async get(id) {
    const { data, error } = await requireSupabase()
      .from('predictions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToPrediction(data) : undefined;
  },
  async create(p) {
    // id / user_id / created_at / updated_at は DB 側が既定値で埋める
    const { data, error } = await requireSupabase()
      .from('predictions')
      .insert(p)
      .select()
      .single();
    if (error) throw error;
    return rowToPrediction(data);
  },
  async update(id, patch) {
    // updated_at は DB のトリガーが自動更新する
    const { error } = await requireSupabase()
      .from('predictions')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await requireSupabase().from('predictions').delete().eq('id', id);
    if (error) throw error;
  },
};

/* ---------------- アクティブ実装の差し替え点 ---------------- */

let active: PredictionRepository = localRepository;

export function setActiveRepository(next: PredictionRepository): void {
  active = next;
}

// 呼び出し側はこの repo だけを使う(実装はログイン状態で差し替わる)
export const repo: PredictionRepository = {
  list: () => active.list(),
  get: (id) => active.get(id),
  create: (p) => active.create(p),
  update: (id, patch) => active.update(id, patch),
  remove: (id) => active.remove(id),
};

/* ---------------- ローカル→Supabase 初回移行 ---------------- */

export async function localCount(): Promise<number> {
  return db.predictions.count();
}

// ローカルの全予想を Supabase へアップロード。
// id をそのまま使い upsert するので、二重に押しても重複しない(冪等)。
export async function migrateLocalToSupabase(): Promise<number> {
  const locals = await localRepository.list();
  if (locals.length === 0) return 0;
  const { error } = await requireSupabase()
    .from('predictions')
    .upsert(locals, { onConflict: 'id' });
  if (error) throw error;
  return locals.length;
}
