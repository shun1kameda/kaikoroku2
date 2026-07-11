# Phase 1.5 — Supabase同期(セットアップ手順)

ログイン時は Supabase、未ログイン時はローカル(IndexedDB)を使う。実装は
`src/repository.ts` の repository層に隔離済み。環境変数が未設定なら自動で
ローカルのみ動作する(=Vercelに変数を入れる前でもプレビューは壊れない)。

## 1. Supabaseプロジェクト作成(スマホのブラウザで)
1. `supabase.com` → Sign in(GitHub可)
2. New project → Project name `kaikoroku` / Database Password は Generate して保存 /
   Region は **Northeast Asia (Tokyo)**
3. 「Create new project」→ 1〜2分待つ

## 2. テーブル作成(SQL Editor)
- 左メニュー **SQL Editor → New query** に
  [`supabase/migrations/0001_predictions.sql`](../supabase/migrations/0001_predictions.sql)
  を貼り付けて **Run**。
- `src/types.ts` のスキーマ準拠。`user_id` + RLS(自分の予想だけ見える)と
  `updated_at` 自動更新トリガーを含む。

## 3. 環境変数(Vercel)
Supabase の **Settings → API** で取得し、Vercel のプロジェクト設定
(Settings → Environment Variables)に登録する。コードには直書きしない。

| 変数名 | 値 |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL(`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | anon public key |

- Vite は `VITE_` で始まる変数のみクライアントに露出する。
- anon key は公開前提のキー(RLSで保護)。**service_role キーは絶対に使わない。**
- 変数を追加したら Vercel で再デプロイ(反映のためビルドが必要)。

## 4. 動作
- **未ログイン**: これまで通りローカル(IndexedDB)に保存。
- **ログイン**: ホーム上部のメールアドレス入力 → 「ログイン」でマジックリンク送信。
  メールのリンクを開くとログインし、以降は Supabase に保存(複数端末で共有)。
- **初回移行**: ログイン直後、この端末にローカル予想があれば
  「◯件をクラウドへ」ボタンが出る。押すと id 保持の upsert でアップロード(冪等)。

## メモ
- `@supabase/supabase-js` 追加でバンドルは gzip 約 83KB → 約 139KB に増加。
  将来、動的 import での遅延読み込み(ログイン利用時のみロード)で軽量化可能。
- Auth のメール送信は Supabase の無料枠(既定のメール送信)を使用。独自ドメイン
  送信が必要になれば SMTP 設定を追加する。
