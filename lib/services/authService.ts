import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import type { SignupInput, SignupResult } from "@/types/domain/auth";

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error("이메일 또는 비밀번호를 확인해주세요");
}

export async function signUp(input: SignupInput): Promise<SignupResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.displayName } },
  });

  const duplicateMessage = "이미 가입된 이메일입니다. 로그인해주세요";
  if (error) {
    if (
      error.code === "user_already_exists" ||
      error.code === "email_exists" ||
      error.message.toLowerCase().includes("already registered")
    ) {
      throw new Error(duplicateMessage);
    }
    throw new Error("회원가입에 실패했습니다. 다시 시도해주세요");
  }

  // 이메일 인증이 활성화된 경우 기존 인증 계정은 오류 대신
  // identities가 비어 있는 가짜 사용자 응답을 반환한다.
  if (!data.session && data.user?.identities?.length === 0) {
    throw new Error(duplicateMessage);
  }
  if (!data.user) {
    throw new Error("회원가입에 실패했습니다. 다시 시도해주세요");
  }

  return { status: data.session ? "signed_in" : "confirmation_required" };
}

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
