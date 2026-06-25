import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // 사용자 컨텍스트 초기화 — 로그아웃 직후 다음 사용자가 로그인하기 전까지
  // 이전 세션의 couple/profile 정보가 store에 남지 않게 한다.
  useCoupleStore.getState().reset();

  // TODO (#7 PWA): 여기서 사용자별 cache 삭제 트리거
  //   - Service Worker로 `CLEAR_USER_CACHE` postMessage 전송
  //   - 또는 caches.keys() 순회하여 사용자 ID 포함 캐시 삭제
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function verifyPasswordResetOtp(
  email: string,
  token: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });
  if (error) throw error;
}

export async function resetPassword(newPassword: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
