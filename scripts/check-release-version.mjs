import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function checkReleaseVersion(root = process.cwd()) {
  try {
    const [manifestText, lockText, changelog, noticeText] = await Promise.all([
      readFile(join(root, "package.json"), "utf8"),
      readFile(join(root, "package-lock.json"), "utf8"),
      readFile(join(root, "CHANGELOG.md"), "utf8"),
      readFile(join(root, "lib/content/releaseNotes.json"), "utf8"),
    ]);
    const { version } = JSON.parse(manifestText);
    const lock = JSON.parse(lockText);
    const errors = [];
    const notice = JSON.parse(noticeText);
    if (notice.version !== version) errors.push("앱 버전과 lib/content/releaseNotes.json의 안내 버전을 일치시켜주세요.");
    if (!Array.isArray(notice.items) || !notice.items.length || notice.items.some(item => typeof item !== "string" || !item.trim())) errors.push("업데이트 안내에 비어 있지 않은 변경 내용을 한 문장씩 추가해주세요.");
    if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
      errors.push("package.json 버전은 1.1.0과 같은 안정 버전 형식이어야 합니다.");
    }
    if (lock.version !== version || lock.packages?.[""]?.version !== version) {
      errors.push("package-lock.json의 두 앱 버전을 package.json과 일치시켜주세요.");
    }
    const recordedVersions = [...changelog.matchAll(/^## \[([^\]\r\n]+)\](?:\s|$)/gm)].map(match => match[1]);
    if (!recordedVersions.includes(version)) errors.push(`CHANGELOG.md에 [${version}] 배포 기록을 추가해주세요.`);
    return errors;
  } catch {
    return ["package.json, package-lock.json, CHANGELOG.md, lib/content/releaseNotes.json 파일을 읽고 형식을 확인할 수 있어야 합니다."];
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await checkReleaseVersion();
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log("앱 버전·잠금 파일·변경 기록·업데이트 안내가 일치합니다.");
}
