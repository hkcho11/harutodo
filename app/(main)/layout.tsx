import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomTabBar from "@/components/layout/BottomTabBar";
import CoupleProvider from "@/components/providers/CoupleProvider";
import ProfileErrorScreen from "@/components/common/ProfileErrorScreen";
import ToastContainer from "@/components/common/ToastContainer";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle();

  if (!couple) {
    redirect("/couple/connect");
  }

  const partnerId =
    couple.user1_id === user.id ? couple.user2_id : couple.user1_id;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", [user.id, partnerId]);

  const me = profiles?.find((p) => p.id === user.id) ?? null;
  const partner = profiles?.find((p) => p.id === partnerId) ?? null;

  // 내 프로필이 없으면 계정이 삭제된 것 — Route Handler를 통해 세션 쿠키를 만료시킨다.
  // Server Component에서 직접 signOut()을 호출하면 Set-Cookie 헤더가 응답에 포함되지 않아
  // 브라우저 쿠키가 실제로 지워지지 않는다.
  if (!me) {
    redirect("/api/auth/signout");
  }
  if (!partner) {
    return <ProfileErrorScreen missing="partner" />;
  }

  return (
    <CoupleProvider coupleId={couple.id} me={me} partner={partner}>
      <div className="flex flex-col min-h-dvh">
        <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <BottomTabBar />
        <ToastContainer />
      </div>
    </CoupleProvider>
  );
}
