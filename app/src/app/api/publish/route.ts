/**
 * POST /api/publish
 *
 * Phase 5：GitHub 一鍵發布
 *
 * 接收 { postId }，執行以下流程：
 *   1. 從 SQLite 讀取文章（htmlSnapshot + slug）
 *   2. 掃描 htmlSnapshot 中的 /uploads/ 圖片路徑
 *   3. 將 HTML 推送到 GitHub 倉庫 posts/{slug}.html
 *   4. 將所有關聯圖片推送到 GitHub 倉庫 uploads/{...}
 *   5. 回傳結果（GitHub Pages URL、各檔案狀態）
 *
 * 所需環境變數（設定於 .env）：
 *   GITHUB_TOKEN  — GitHub Personal Access Token（需有 repo write 權限）
 *   GITHUB_OWNER  — 倉庫擁有者（使用者名稱或 org）
 *   GITHUB_REPO   — 倉庫名稱
 *   GITHUB_BRANCH — 目標分支（選填，預設 main）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";

// ─── 環境變數 ──────────────────────────────────────────────────────────────────
const GITHUB_API = "https://api.github.com";
const TOKEN  = process.env.GITHUB_TOKEN  ?? "";
const OWNER  = process.env.GITHUB_OWNER  ?? "";
const REPO   = process.env.GITHUB_REPO   ?? "";
const BRANCH = process.env.GITHUB_BRANCH ?? "main";

// ─── GitHub REST 輔助函式 ──────────────────────────────────────────────────────

/** 取得指定路徑的現有 SHA（用於更新已存在的檔案）*/
async function getFileSha(filePath: string): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LuminaCMS/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sha?: string };
    return data.sha ?? null;
  } catch {
    return null;
  }
}

/** 建立或更新 GitHub 倉庫中的檔案（PUT）*/
async function putGitHubFile(
  filePath: string,
  contentBase64: string,
  message: string,
  sha: string | null,
): Promise<{ htmlUrl: string }> {
  const url = `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const body: Record<string, unknown> = {
    message,
    content: contentBase64,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LuminaCMS/1.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(
      `GitHub API ${res.status}: ${err.message ?? JSON.stringify(err)}`,
    );
  }

  const data = (await res.json()) as { content?: { html_url?: string } };
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
  const body = await req.json().catch(() => null) as { postId?: string } | null;
  if (!body?.postId) {
    return NextResponse.json({ error: "POST_ID_REQUIRED" }, { status: 400 });
  }

  // ── 2. 從 SQLite 讀取文章 ─────────────────────────────────────────────────────
  const post = db
    .prepare(
      "SELECT id, slug, title, htmlSnapshot FROM Post WHERE id = ? LIMIT 1",
    )
    .get(body.postId) as
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

  // ── 3. 掃描 htmlSnapshot 中的圖片路徑 ────────────────────────────────────────
  const imgMatches = [
    ...post.htmlSnapshot.matchAll(/(?:src|srcset)="(\/uploads\/[^"]+)"/g),
  ];
  const imgPaths = [...new Set(imgMatches.map((m) => m[1]))];

  const UPLOAD_ROOT = path.join(process.cwd(), "public");
  const fileResults: FileResult[] = [];

  // ── 4. 上傳圖片到 GitHub ──────────────────────────────────────────────────────
  for (const imgPath of imgPaths) {
    const localPath = path.join(UPLOAD_ROOT, imgPath);
    try {
      const fileBuffer = await fs.readFile(localPath);
      const imgBase64 = fileBuffer.toString("base64");
      // GitHub 路徑去掉開頭的 /（e.g., /uploads/... → uploads/...）
      const ghPath = imgPath.replace(/^\//, "");
      const imgSha = await getFileSha(ghPath);
      await putGitHubFile(
        ghPath,
        imgBase64,
        `assets: sync ${imgPath}`,
        imgSha,
      );
      fileResults.push({ path: ghPath, status: "ok" });
    } catch (e) {
      fileResults.push({ path: imgPath, status: "error", error: String(e) });
    }
  }

  // ── 5. 上傳 HTML 到 GitHub ────────────────────────────────────────────────────
  const htmlGhPath = `posts/${post.slug}.html`;
  let htmlGhUrl = "";
  try {
    const htmlBase64 = Buffer.from(post.htmlSnapshot, "utf-8").toString("base64");
    const htmlSha = await getFileSha(htmlGhPath);
    const { htmlUrl } = await putGitHubFile(
      htmlGhPath,
      htmlBase64,
      `publish: ${post.title}`,
      htmlSha,
    );
    htmlGhUrl = htmlUrl;
    fileResults.push({ path: htmlGhPath, status: "ok" });
  } catch (e) {
    fileResults.push({ path: htmlGhPath, status: "error", error: String(e) });
    return NextResponse.json(
      {
        error: "HTML_UPLOAD_FAILED",
        detail: String(e),
        results: fileResults,
      },
      { status: 500 },
    );
  }

  // ── 6. 回傳成功結果 ────────────────────────────────────────────────────────────
  const pagesUrl = `https://${OWNER}.github.io/${REPO}/posts/${post.slug}.html`;

  return NextResponse.json({
    ok: true,
    slug: post.slug,
    title: post.title,
    htmlGhUrl,
    pagesUrl,
    imageCount: imgPaths.length,
    results: fileResults,
  });
}
