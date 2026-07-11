import { useEffect, useState, useCallback } from 'react';
import type { Prediction, BetType } from './types';
import { VENUES, STATUS_LABEL } from './types';
import { repo } from './repository';

type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [items, setItems] = useState<Prediction[]>([]);

  const reload = useCallback(async () => {
    setItems(await repo.list());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const go = (r: Route) => { setRoute(r); window.scrollTo(0, 0); };

  return (
    <div className="shell">
      {route.name === 'home' && (
        <Home items={items} onOpen={(id) => go({ name: 'detail', id })} onNew={() => go({ name: 'new' })} />
      )}
      {route.name === 'new' && (
        <PredictionForm
          onCancel={() => go({ name: 'home' })}
          onSaved={async () => { await reload(); go({ name: 'home' }); }}
        />
      )}
      {route.name === 'edit' && (
        <EditLoader id={route.id}
          onCancel={() => go({ name: 'detail', id: route.id })}
          onSaved={async () => { await reload(); go({ name: 'detail', id: route.id }); }}
        />
      )}
      {route.name === 'detail' && (
        <DetailLoader id={route.id}
          onBack={() => go({ name: 'home' })}
          onEdit={() => go({ name: 'edit', id: route.id })}
          onDeleted={async () => { await reload(); go({ name: 'home' }); }}
        />
      )}
    </div>
  );
}

/* ---------------- Home ---------------- */

function Home({ items, onOpen, onNew }: {
  items: Prediction[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <>
      <header className="brand">
        <div className="mark">回</div>
        <div>
          <h1>回顧録</h1>
          <p className="sub">予想の答え合わせで、読みを鍛える</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <div className="big">🐎</div>
          <p>まだ予想がありません。<br />右下の「+」から最初の予想を記録しましょう。<br />当たり外れではなく「どの読みが正しかったか」を貯める場所です。</p>
        </div>
      ) : (
        items.map((p) => (
          <div key={p.id} className="card pcard" onClick={() => onOpen(p.id)}>
            <div className="pcard-top">
              <p className="pcard-name">{p.race_name || '(レース名未設定)'}</p>
              <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <div className="pcard-meta">
              <span>{p.race_date}</span>
              <span>{p.venue}</span>
              {p.bet_type === 'pass'
                ? <span className="passmark">見送り</span>
                : p.confidence
                  ? <span className="conf">{'★'.repeat(p.confidence)}</span>
                  : null}
            </div>
          </div>
        ))
      )}

      <button className="fab" onClick={onNew} aria-label="新規予想">+</button>
    </>
  );
}

/* ---------------- Form (new / edit) ---------------- */

const emptyForm = {
  race_name: '',
  race_date: new Date().toISOString().slice(0, 10),
  venue: VENUES[0] as string,
  pace_hypothesis: '',
  track_bias_hypothesis: '',
  pick_rationale: '',
  concerns: '',
  bet_type: 'bet' as BetType,
  bet_detail: '',
  confidence: null as number | null,
};

function PredictionForm({ initial, onCancel, onSaved }: {
  initial?: Prediction;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState(initial ? {
    race_name: initial.race_name,
    race_date: initial.race_date,
    venue: initial.venue,
    pace_hypothesis: initial.pace_hypothesis,
    track_bias_hypothesis: initial.track_bias_hypothesis,
    pick_rationale: initial.pick_rationale,
    concerns: initial.concerns,
    bet_type: initial.bet_type,
    bet_detail: initial.bet_detail,
    confidence: initial.confidence,
  } : emptyForm);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.race_name.trim()) { alert('レース名を入力してください'); return; }
    setSaving(true);
    try {
      if (initial) {
        await repo.update(initial.id, { ...f });
      } else {
        await repo.create({ ...f, status: 'awaiting_result' });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <button className="back" onClick={onCancel}>←</button>
        <h2>{initial ? '予想を編集' : '新しい予想'}</h2>
      </div>

      <div className="card">
        <div className="soon">🎤 音声入力・AI整理は次のアップデートで追加予定</div>

        <label className="f">レース名 *</label>
        <input type="text" value={f.race_name} onChange={(e) => set('race_name', e.target.value)} placeholder="例)宝塚記念" />

        <div className="row2" style={{ marginTop: 14 }}>
          <div>
            <label className="f" style={{ margin: '0 0 6px' }}>日付</label>
            <input type="date" value={f.race_date} onChange={(e) => set('race_date', e.target.value)} />
          </div>
          <div>
            <label className="f" style={{ margin: '0 0 6px' }}>競馬場</label>
            <select value={f.venue} onChange={(e) => set('venue', e.target.value)}>
              {VENUES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <label className="f">① 展開・ペース仮説</label>
        <textarea rows={3} value={f.pace_hypothesis} onChange={(e) => set('pace_hypothesis', e.target.value)} placeholder="逃げ馬の数、想定ペース、有利な脚質…" />

        <label className="f">② 馬場・バイアス仮説</label>
        <textarea rows={3} value={f.track_bias_hypothesis} onChange={(e) => set('track_bias_hypothesis', e.target.value)} placeholder="内外どちらが伸びる、時計の速さ、天候の影響…" />

        <label className="f">③ 本命の根拠</label>
        <textarea rows={3} value={f.pick_rationale} onChange={(e) => set('pick_rationale', e.target.value)} placeholder="本命・軸を推す理由を一行で…" />

        <label className="f">④ 不安要素</label>
        <textarea rows={3} value={f.concerns} onChange={(e) => set('concerns', e.target.value)} placeholder="外れるとしたら何が原因か…" />

        <label className="f">⑤ 買い目 / 見送り</label>
        <div className="toggle">
          <button className={f.bet_type === 'bet' ? 'on' : ''} onClick={() => set('bet_type', 'bet')}>購入</button>
          <button className={f.bet_type === 'pass' ? 'on' : ''} onClick={() => set('bet_type', 'pass')}>見送り</button>
        </div>
        <textarea rows={2} style={{ marginTop: 10 }} value={f.bet_detail} onChange={(e) => set('bet_detail', e.target.value)}
          placeholder={f.bet_type === 'bet' ? '買い目(例:3連複 ◯-△-手広く)' : '見送りの理由'} />

        {f.bet_type === 'bet' && (
          <>
            <label className="f">自信度</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={f.confidence === n ? 'on' : ''}
                  onClick={() => set('confidence', f.confidence === n ? null : n)}>{n}</button>
              ))}
            </div>
            <p className="hint">見送り判断も立派な予想です。買わない理由も検証対象になります。</p>
          </>
        )}

        <div className="btnrow">
          <button className="btn ghost" onClick={onCancel}>やめる</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存する'}</button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Detail ---------------- */

const FIELD_LABELS: { key: keyof Prediction; label: string }[] = [
  { key: 'pace_hypothesis', label: '① 展開・ペース' },
  { key: 'track_bias_hypothesis', label: '② 馬場・バイアス' },
  { key: 'pick_rationale', label: '③ 本命の根拠' },
  { key: 'concerns', label: '④ 不安要素' },
];

function Detail({ p, onBack, onEdit, onDeleted }: {
  p: Prediction;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const del = async () => {
    if (!confirm('この予想を削除しますか?この操作は元に戻せません。')) return;
    await repo.remove(p.id);
    onDeleted();
  };

  return (
    <>
      <div className="topbar">
        <button className="back" onClick={onBack}>←</button>
        <h2>{p.race_name}</h2>
      </div>

      <div className="card">
        <div className="pcard-meta" style={{ marginTop: 0, marginBottom: 4 }}>
          <span>{p.race_date}</span>
          <span>{p.venue}</span>
          <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status]}</span>
        </div>

        {FIELD_LABELS.map(({ key, label }) => {
          const val = p[key] as string;
          return (
            <div key={key} className="drow">
              <span className="dtag">{label}</span>
              {val ? <p className="dval">{val}</p> : <p className="dempty">(記載なし)</p>}
            </div>
          );
        })}

        <div className="drow" style={{ borderBottom: 'none' }}>
          <span className="dtag">⑤ {p.bet_type === 'pass' ? '見送り' : '買い目'}</span>
          {p.bet_detail ? <p className="dval">{p.bet_detail}</p> : <p className="dempty">(記載なし)</p>}
          {p.bet_type === 'bet' && p.confidence && (
            <p className="dval" style={{ marginTop: 4 }}>
              自信度 <span className="conf">{'★'.repeat(p.confidence)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="soon">📝 レース後の「結果入力とAI答え合わせ」は次のアップデートで追加予定</div>

      <div className="btnrow">
        <button className="btn ghost" onClick={onEdit}>編集</button>
        <button className="btn danger" onClick={del}>削除</button>
      </div>
    </>
  );
}

/* ---------------- Loaders ---------------- */

function DetailLoader(props: { id: string; onBack: () => void; onEdit: () => void; onDeleted: () => void }) {
  const [p, setP] = useState<Prediction | null | undefined>(undefined);
  useEffect(() => { repo.get(props.id).then((r) => setP(r ?? null)); }, [props.id]);
  if (p === undefined) return null;
  if (p === null) return <div className="empty"><p>予想が見つかりません</p></div>;
  return <Detail p={p} onBack={props.onBack} onEdit={props.onEdit} onDeleted={props.onDeleted} />;
}

function EditLoader(props: { id: string; onCancel: () => void; onSaved: () => void }) {
  const [p, setP] = useState<Prediction | null | undefined>(undefined);
  useEffect(() => { repo.get(props.id).then((r) => setP(r ?? null)); }, [props.id]);
  if (p === undefined) return null;
  if (p === null) return <div className="empty"><p>予想が見つかりません</p></div>;
  return <PredictionForm initial={p} onCancel={props.onCancel} onSaved={props.onSaved} />;
}
