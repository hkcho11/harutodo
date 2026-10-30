import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkReleaseVersion } from "../../../scripts/check-release-version.mjs";

const roots: string[] = [];
async function fixture({ version = "1.1.0", lockVersion = version, rootVersion = version, noticeVersion = version, noticeItems = ["의견을 남길 수 있어요."], changelog = "## [1.1.0] - 배포 준비\n### 추가\n- 의견함\n" }: { version?: string; lockVersion?: string; rootVersion?: string; noticeVersion?: string; noticeItems?: string[]; changelog?: string } = {}) {
  const root = await mkdtemp(join(tmpdir(), "harutodo-version-")); roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify({ version }));
  await writeFile(join(root, "package-lock.json"), JSON.stringify({ version: lockVersion, packages: { "": { version: rootVersion } } }));
  await writeFile(join(root, "CHANGELOG.md"), changelog);
  await mkdir(join(root, "lib/content"), { recursive: true });
  await writeFile(join(root, "lib/content/releaseNotes.json"), JSON.stringify({ version: noticeVersion, items: noticeItems }));
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
describe("배포 버전 일관성 검증", () => {
  it("앱과 업데이트 안내 버전이 다르면 배포를 막는다", async () => {
    expect((await checkReleaseVersion(await fixture({ noticeVersion: "1.0.0" }))).length).toBeGreaterThan(0);
  });
  it("빈 업데이트 안내로 배포하지 못하게 한다", async () => {
    expect((await checkReleaseVersion(await fixture({ noticeItems: [] }))).length).toBeGreaterThan(0);
    expect((await checkReleaseVersion(await fixture({ noticeItems: ["  "] }))).length).toBeGreaterThan(0);
  });
  it("앱·잠금 파일·변경 기록의 버전이 맞으면 통과한다", async () => {
    expect(await checkReleaseVersion(await fixture())).toEqual([]);
  });
  it("잠금 파일의 루트 패키지 버전 누락이나 불일치를 거부한다", async () => {
    expect((await checkReleaseVersion(await fixture({ rootVersion: "1.0.0" }))).length).toBeGreaterThan(0);
    expect((await checkReleaseVersion(await fixture({ lockVersion: "1.0.0" }))).length).toBeGreaterThan(0);
  });
  it("현재 버전의 변경 기록이 없으면 거부한다", async () => {
    expect((await checkReleaseVersion(await fixture({ changelog: "## [1.0.0]\n" }))).length).toBeGreaterThan(0);
  });
  it("앞에 0이 붙은 잘못된 안정 버전을 거부한다", async () => {
    expect((await checkReleaseVersion(await fixture({ version: "1.01.0", changelog: "## [1.01.0]\n" }))).length).toBeGreaterThan(0);
  });
});
