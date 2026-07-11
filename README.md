# 回顧録(kaikoroku)— 競馬予想の検証ノート PWA

予想の答え合わせで、読みを鍛える。当たり外れではなく「どの仮説が生きて、どの仮説が死んだか」を記録・検証するアプリ。

## 現在の状態:Phase 1 完了
- ✅ 予想の記録(構造フォーム5項目)・一覧・詳細・編集・削除
- ✅ IndexedDB(Dexie)でローカル永続化 — repository層に隔離済み
- ✅ PWA(manifest + Service Worker、ホーム画面追加・オフライン起動)
- ⬜ Phase 1.5: Supabase同期(repository差し替え)
- ⬜ Phase 2: AI構造化・AI答え合わせ(Anthropic API + 中継関数)
- ⬜ Phase 3: 馬場ノート
- ⬜ Phase 4: 検証ノート(集計)
- ⬜ Phase 5: Stripe課金

## 開発
```bash
npm install
npm run dev      # 開発サーバ
npm run build    # 本番ビルド(型チェック込み)
```

## デプロイ(Vercel)
リポジトリをVercelに接続するだけ。Framework Preset: Vite。

## 設計メモ
- データアクセスは `src/repository.ts` に隔離。Supabase移行時はこのファイルの
  `repo` を差し替えるだけで呼び出し側は変更不要。
- スキーマは `src/types.ts`。Supabaseのテーブル定義もこの型に合わせる。
- デザイントークンは `src/styles.css` の `:root`。
- スコープ外(作らない):レースデータ/オッズ配信、SNS機能、馬券購入連携。
