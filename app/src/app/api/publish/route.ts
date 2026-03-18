/**
 * POST /api/publish
 *
 * Phase 5：GitHub 一鍵發布
 *
 * 接收 { postId }，執行以下流程：
 *   1. 從 SQLite 讀取文章（htmlSnapshot + slug）
 *   2. 掃描 htmlSnapshot 中的 /uploads/ 圖片路徑
 *   3. 將所有關聯圖片推送到 GitHub 倉庫 uploads/{...}
 *   4. 將 HTML 推送到 GitHub 倉庫 posts/{slug}.html
 *   5. 回傳結果（GitHub Pages URL、各檔案狀態）
 *
 * 409 衝突處理策略：
 *   - getFileSha：區分 404（檔案不存在）與真實錯誤（401/403/5xx）
 *   - putGitHubFile：遇到 409 自動抓取最新 SHA 重試一次（TOCTOU 防護）
 *   - 所有 GitHub API 錯誤回傳完整 response body，方便除錯
 *
 * 所需環境變數（設定於 .env）：
 *   GITHUB_TOKEN  — GitHub Personal Access Token（需有 repo write 權限）
 *   GITHUB_OWNER  — 倉庫擁有者（使用者名稱或 org）
 *   GITHUB_REPO   — 倉庫名稱
 *   GITHUB_BRANCH — 目標分支（選填，預設 main）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rewriteImagePathsForGitHubPages } from "@/lib/craftToHtml";
import fs from "node:fs/promises";
import path from "node:path";

// ─── 環境變數 ──────────────────────────────────────────────────────────────────
const GITHUB_API = "https://api.github.com";
const TOKEN  = process.env.GITHUB_TOKEN  ?? "";
const OWNER  = process.env.GITHUB_OWNER  ?? "";
const REPO   = process.env.GITHUB_REPO   ?? "";
const BRANCH = process.env.GITHUB_BRANCH ?? "main";

/** 共用 GitHub API 請求 headers */
const GH_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "LuminaCMS/1.0",
};

// ─── GitHub 錯誤詳情型別 ───────────────────────────────────────────────────────
type GitHubErrorBody = {
  message?: string;
  errors?: { resource?: string; code?: string; field?: string; message?: string }[];
  documentation_url?: string;
};

/** 從 GitHub API 回應建構可讀的錯誤訊息 */
function buildGhError(status: number, body: GitHubErrorBody, ctx: string): string {
  const parts: string[] = [`[${ctx}] GitHub ${status}`];
  if (body.message) parts.push(body.message);
  if (body.errors?.length) {
    parts.push(
      body.errors.map((e) => [e.resource, e.field, e.code, e.message].filter(Boolean).join(" / ")).join(" | "),
    );
  }
  if (body.documentation_url) parts.push(`→ ${body.documentation_url}`);
  return parts.join(" — ");
}

// ─── GitHub REST 輔助函式 ──────────────────────────────────────────────────────

/**
 * 取得指定路徑的現有 SHA。
 *
 * 回傳規則：
 *   - 檔案存在   → { sha: string,  exists: true  }
 *   - 檔案不存在 → { sha: null,    exists: false }
 *   - 真實錯誤   → throw（包含 GitHub 完整錯誤訊息）
 */
async function getFileSha(
  filePath: string,
): Promise<{ sha: string | null; exists: boolean }> {
  const url =
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}` +
    `?ref=${encodeURIComponent(BRANCH)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: GH_HEADERS, cache: "no-store" });
  } catch (e) {
    throw new Error(`[getFileSha] 網路錯誤：${String(e)}`);
  }

  // 404 表示檔案尚不存在，屬於正常情況（首次建立）
  if (res.status === 404) {
    return { sha: null, exists: false };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as GitHubErrorBody;
    throw new Error(buildGhError(res.status, body, `getFileSha(${filePath})`));
  }

  const data = await res.json() as { sha?: string };
  return { sha: data.sha ?? null, exists: true };
}

/**
 * 建立或更新 GitHub 倉庫中的檔案（PUT）。
 *
 * 409 衝突自動重試：
 *   若 PUT 回傳 409（SHA 在 GET/PUT 之間被更新），
 *   自動重新取得最新 SHA 並重試一次，避免因 TOCTOU 競爭造成的失敗。
 */
async function putGitHubFile(
  filePath: string,
  contentBase64: string,
  message: string,
  sha: string | null,
): Promise<{ htmlUrl: string }> {
  const doRequest = async (currentSha: string | null) => {
    const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
    const reqBody: Record<string, unknown> = {
      message,
      content: contentBase64,
      branch: BRANCH,
    };
    if (currentSha) reqBody.sha = currentSha;

    console.log(
      `[publish] PUT ${filePath} | sha=${currentSha ?? "new"} | branch=${BRANCH}`,
    );

    return fetch(url, {
      method: "PUT",
      headers: { ...GH_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });
  };

  let res = await doRequest(sha);

  // 409：SHA 過期 → 重新抓取最新 SHA 並重試一次
  if (res.status === 409) {
    console.warn(
      `[publish] 409 conflict on ${filePath}, fetching fresh SHA and retrying…`,
    );
    const { sha: freshSha } = await getFileSha(filePath);
    res = await doRequest(freshSha);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as GitHubErrorBody;
    const msg = buildGhError(res.status, body, `putGitHubFile(${filePath})`);
    console.error(`[publish] ✕ ${msg}`);
    throw new Error(msg);
  }

  const data = await res.json() as { content?: { html_url?: string } };
  console.log(`[publish] ✓ ${filePath}`);
  return { htmlUrl: data.content?.html_url ?? "" };
}

// ─── 發布結果型別 ──────────────────────────────────────────────────────────────
type FileResult = {
  path: string;
  status: "ok" | "skipped" | "error";
  error?: string;
};

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 0. 環境變數檢查 ──────────────────────────────────────────────────────────
  if (!TOKEN || !OWNER || !REPO) {
    return NextResponse.json(
      {
        error: "GITHUB_NOT_CONFIGURED",
        hint: "請在 .env 中設定以下環境變數：GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO",
        missing: [
          !TOKEN && "GITHUB_TOKEN",
          !OWNER && "GITHUB_OWNER",
          !REPO  && "GITHUB_REPO",
        ].filter(Boolean),
      },
      { status: 503 },
    );
  }

  // ── 1. 解析請求 ──────────────────────────────────────────────────────────────
  const reqBody = await req.json().catch(() => null) as { postId?: string } | null;
  if (!reqBody?.postId) {
    return NextResponse.json({ error: "POST_ID_REQUIRED" }, { status: 400 });
  }

  // ── 2. 從 SQLite 讀取文章 ─────────────────────────────────────────────────────
  const post = db
    .prepare(
      "SELECT id, slug, title, htmlSnapshot FROM Post WHERE id = ? LIMIT 1",
    )
    .get(reqBody.postId) as
    | { id: string; slug: string; title: string; htmlSnapshot: string }
    | undefined;

  if (!post) {
    return NextResponse.json({ error: "POST_NOT_FOUND" }, { status: 404 });
  }

  if (!post.htmlSnapshot?.trim()) {
    return NextResponse.json(
      { error: "NO_HTML_SNAPSHOT", hint: "請先儲存/發布文章以產生 HTML 快照" },
      { status: 422 },
    );
  }

  console.log(`[publish] 開始發布文章 id=${post.id} slug=${post.slug}`);

  // ── 3. 掃描 htmlSnapshot 中的圖片路徑 ────────────────────────────────────────
  const imgMatches = [
    ...post.htmlSnapshot.matchAll(/(?:src|srcset)="(\/uploads\/[^"]+)"/g),
  ];
  const imgPaths = [...new Set(imgMatches.map((m) => m[1]))];
  console.log(`[publish] 發現 ${imgPaths.length} 張圖片：`, imgPaths);

  const UPLOAD_ROOT = path.join(process.cwd(), "public");
  const fileResults: FileResult[] = [];

  // ── 4. 上傳圖片到 GitHub（先確認 SHA，再 PUT）────────────────────────────────
  for (const imgPath of imgPaths) {
    const localPath = path.join(UPLOAD_ROOT, imgPath);
    const ghPath = imgPath.replace(/^\//, "");  // /uploads/... → uploads/...

    try {
      // 確認本地檔案存在
      await fs.access(localPath);
      const fileBuffer = await fs.readFile(localPath);
      const imgBase64 = fileBuffer.toString("base64");

      // 取得現有 SHA（區分 404/真實錯誤）
      const { sha: imgSha, exists } = await getFileSha(ghPath);
      console.log(
        `[publish] 圖片 ${ghPath} ${exists ? `已存在 sha=${imgSha}` : "（新檔案）"}`,
      );

      await putGitHubFile(ghPath, imgBase64, `assets: sync ${imgPath}`, imgSha);
      fileResults.push({ path: ghPath, status: "ok" });
    } catch (e) {
      const errMsg = String(e);
      console.error(`[publish] 圖片上傳失敗 ${ghPath}：${errMsg}`);
      fileResults.push({ path: ghPath, status: "error", error: errMsg });
      // 圖片失敗不中斷整體流程，繼續上傳其他圖片與 HTML
    }
  }

  // ── 5. 上傳 HTML 到 GitHub（先修正圖片路徑）──────────────────────────────────
  const htmlGhPath = `posts/${post.slug}.html`;
  let htmlGhUrl = "";

  try {
    // 將 /uploads/... 重寫為 /{REPO}/uploads/...，符合 GitHub Pages 路徑結構
    const patchedHtml = rewriteImagePathsForGitHubPages(post.htmlSnapshot, REPO);
    const htmlBase64 = Buffer.from(patchedHtml, "utf-8").toString("base64");
    const { sha: htmlSha, exists: htmlExists } = await getFileSha(htmlGhPath);
    console.log(
      `[publish] HTML ${htmlGhPath} ${htmlExists ? `已存在 sha=${htmlSha}` : "（新檔案）"}`,
    );

    const { htmlUrl } = await putGitHubFile(
      htmlGhPath,
      htmlBase64,
      `publish: ${post.title}`,
      htmlSha,
    );
    htmlGhUrl = htmlUrl;
    fileResults.push({ path: htmlGhPath, status: "ok" });
  } catch (e) {
    const errMsg = String(e);
    console.error(`[publish] HTML 上傳失敗：${errMsg}`);
    fileResults.push({ path: htmlGhPath, status: "error", error: errMsg });
    return NextResponse.json(
      { error: "HTML_UPLOAD_FAILED", detail: errMsg, results: fileResults },
      { status: 500 },
    );
  }

  // ── 6. 回傳成功結果 ────────────────────────────────────────────────────────────
  const pagesUrl = `https://${OWNER}.github.io/${REPO}/posts/${post.slug}.html`;
  const failedImages = fileResults.filter(
    (r) => r.path !== htmlGhPath && r.status === "error",
  );

  console.log(
    `[publish] 完成 slug=${post.slug} | 成功圖片：${imgPaths.length - failedImages.length}/${imgPaths.length}`,
  );

  return NextResponse.json({
    ok: true,
    slug: post.slug,
    title: post.title,
    htmlGhUrl,
    pagesUrl,
    imageCount: imgPaths.length,
    imageFailCount: failedImages.length,
    results: fileResults,
  });
}
