import { beforeEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/services/authService";

const { signupMock } = vi.hoisted(() => ({ signupMock: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: signupMock } }),
}));

const input = { email: "existing@example.com", password: "test-password", displayName: "테스트" };

describe("signUp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("기존 인증 계정의 가짜 성공 응답을 중복 가입 오류로 처리한다", async () => {
    signupMock.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    await expect(signUp(input)).rejects.toThrow("이미 가입된 이메일입니다. 로그인해주세요");
  });

  it("서버의 명시적인 중복 계정 오류도 같은 안내로 처리한다", async () => {
    signupMock.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists", message: "User already registered" } });
    await expect(signUp(input)).rejects.toThrow("이미 가입된 이메일입니다. 로그인해주세요");
  });

  it("신규 계정은 이메일 확인 흐름으로 진행한다", async () => {
    signupMock.mockResolvedValue({ data: { user: { identities: [{ provider: "email" }] }, session: null }, error: null });
    await expect(signUp(input)).resolves.toEqual({ status: "confirmation_required" });
    expect(signupMock).toHaveBeenCalledWith({ email: input.email, password: input.password, options: { data: { display_name: input.displayName } } });
  });

  it("세션이 생성된 가입은 로그인 완료로 처리한다", async () => {
    signupMock.mockResolvedValue({ data: { user: { identities: [{ provider: "email" }] }, session: { access_token: "test-token" } }, error: null });
    await expect(signUp(input)).resolves.toEqual({ status: "signed_in" });
  });

  it("메일 발송 오류를 가입 성공으로 처리하지 않는다", async () => {
    signupMock.mockResolvedValue({ data: { user: null, session: null }, error: { code: "unexpected_failure", message: "Error sending confirmation email" } });
    await expect(signUp(input)).rejects.toThrow("회원가입에 실패했습니다. 다시 시도해주세요");
  });

  it("사용자도 세션도 없는 응답을 성공으로 처리하지 않는다", async () => {
    signupMock.mockResolvedValue({ data: { user: null, session: null }, error: null });
    await expect(signUp(input)).rejects.toThrow("회원가입에 실패했습니다. 다시 시도해주세요");
  });
});
