import type { Metadata, Viewport } from "next";
import "./globals.css";
import SplashScreen from "@/components/common/SplashScreen";

export const metadata: Metadata = {
  title: "Harutodo",
  description: "커플/부부 공유 투두 + 캘린더",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Harutodo",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFCF5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
