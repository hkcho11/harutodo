import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomTabBar from "@/components/layout/BottomTabBar";
import PullToRefresh from "@/components/layout/PullToRefresh";
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

  // 내 프로필 먼저 확인 — 계정이 삭제된 경우 couples보다 먼저 잡아야 한다.
  // (couples는 profiles ON DELETE CASCADE로 함께 삭제되므로 !couple이 먼저 걸려버림)
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!myProfile) {
    redirect("/api/auth/signout");
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

  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partnerProfile) {
    return <ProfileErrorScreen missing="partner" />;
  }

  return (
    <CoupleProvider coupleId={couple.id} me={myProfile} partner={partnerProfile}>
      <div className="flex h-dvh flex-col overflow-hidden">
        <PullToRefresh>
          {children}
        </PullToRefresh>
        <BottomTabBar />
        <ToastContainer />
      </div>
    </CoupleProvider>
  );
}
