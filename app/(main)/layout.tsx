import BottomTabBar from "@/components/layout/BottomTabBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
