// Supabase クライアント。
// URL / anon key は Vercel の環境変数(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// で注入する。コードに直書きしない(指示書ルール)。
// anon key は公開前提のキーで、行レベルセキュリティ(RLS)で保護している。
// 環境変数が未設定のときは supabaseEnabled=false となり、アプリはローカルのみで動作する。

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled: boolean = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anon as string)
  : null;
