import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomTabBar from "@/components/layout/BottomTabBar";

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
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle();

  if (!couple) {
    redirect("/couple/connect");
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
