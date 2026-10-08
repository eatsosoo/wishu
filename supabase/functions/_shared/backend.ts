import { createClient } from 'npm:@supabase/supabase-js@2';

export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
export async function authenticate(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) throw new Error('Bạn cần đăng nhập.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Phiên đăng nhập đã hết hạn.');
  return data.user;
}
