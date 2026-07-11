// repository層 — データアクセスをここに隔離する。
// Phase 1: IndexedDB(Dexie)実装。
// Phase 1.5: この PredictionRepository インターフェースを満たす
//            Supabase 実装に差し替える(呼び出し側は変更不要)。

import Dexie, { type Table } from 'dexie';
import type { Prediction } from './types';

export interface PredictionRepository {
  list(): Promise<Prediction[]>;
  get(id: string): Promise<Prediction | undefined>;
  create(p: Omit<Prediction, 'id' | 'created_at' | 'updated_at'>): Promise<Prediction>;
  update(id: string, patch: Partial<Prediction>): Promise<void>;
  remove(id: string): Promise<void>;
}

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

// 呼び出し側はこの repo を import する(実装の差し替え点)
export const repo: PredictionRepository = localRepository;
