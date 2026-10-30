import packageInfo from "@/package.json";

export default function AppVersion() {
  return (
    <footer className="-mt-2 text-center text-xs leading-4 text-haru-muted" aria-label="앱 버전">
      하루투두 v{packageInfo.version}{process.env.NODE_ENV === "development" ? " · 개발" : ""}
    </footer>
  );
}
