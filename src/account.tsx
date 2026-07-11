// ログイン導線とクラウド同期のUI(Phase 1.5)。
// - Supabase未設定(環境変数なし)のときは何も表示せず、アプリはローカルのみで動作。
// - 未ログイン: メールのマジックリンクでログイン。
// - ログイン中: ログイン状態表示 + ログアウト + ローカルデータの初回アップロード導線。

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from './supabaseClient';
import { localCount, migrateLocalToSupabase } from './repository';

// ログイン状態を購読するフック。
export function useSession(): { session: Session | null; ready: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  // Supabase未設定なら購読不要。最初から ready。
  const [ready, setReady] = useState<boolean>(!supabaseEnabled);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready };
}

function migrateKey(userId: string): string {
  return `kaikoroku_migrated_${userId}`;
}

export function AccountBar({ session, onMigrated }: {
  session: Session | null;
  onMigrated: () => void;
}) {
  if (!supabaseEnabled) return null;
  return session
    ? <SignedIn session={session} onMigrated={onMigrated} />
    : <SignedOut />;
}

function SignedOut() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const addr = email.trim();
    if (!addr) { alert('メールアドレスを入力してください'); return; }
    setSending(true);
    try {
      const { error } = await supabase!.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) { alert(`送信に失敗しました: ${error.message}`); return; }
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="account">
      <p className="a-label">☁️ クラウド同期(ログインすると複数端末で共有できます)</p>
      {sent ? (
        <p className="a-note">
          {email} に確認メールを送りました。メール内のリンクを開くとログインできます。
        </p>
      ) : (
        <div className="a-row">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="a-btn" onClick={send} disabled={sending}>
            {sending ? '送信中…' : 'ログイン'}
          </button>
        </div>
      )}
    </div>
  );
}

function SignedIn({ session, onMigrated }: { session: Session; onMigrated: () => void }) {
  const userId = session.user.id;
  const [localN, setLocalN] = useState(0);
  const [busy, setBusy] = useState(false);
  const migrated = typeof localStorage !== 'undefined' && localStorage.getItem(migrateKey(userId)) === '1';

  useEffect(() => {
    localCount().then(setLocalN);
  }, []);

  const showMigrate = !migrated && localN > 0;

  const migrate = async () => {
    setBusy(true);
    try {
      const n = await migrateLocalToSupabase();
      localStorage.setItem(migrateKey(userId), '1');
      setLocalN(0);
      alert(`${n}件の予想をクラウドへアップロードしました。`);
      onMigrated();
    } catch (e) {
      alert(`アップロードに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase!.auth.signOut();
  };

  return (
    <div className="account">
      <div className="a-row" style={{ alignItems: 'center' }}>
        <span className="a-user">☁️ {session.user.email}</span>
        <button className="a-btn ghost" onClick={signOut}>ログアウト</button>
      </div>
      {showMigrate && (
        <div className="migrate">
          <p>この端末に{localN}件のローカル予想があります。クラウドへアップロードしますか?</p>
          <button className="a-btn" onClick={migrate} disabled={busy}>
            {busy ? 'アップロード中…' : `${localN}件をクラウドへ`}
          </button>
        </div>
      )}
    </div>
  );
}
