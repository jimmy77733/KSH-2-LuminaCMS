import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

import { sanitizeHtml } from "@/lib/sanitizeHtml";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { title, contentJson, htmlSnapshot, cssSnapshot, templateId: clientTemplateId } = body as {
    title?: string;
    contentJson?: string;
    htmlSnapshot?: string;
    cssSnapshot?: string;
    templateId?: string;
  };

  // 防護：title 與 htmlSnapshot 不可為空字串
  if (!title?.trim() || !contentJson || !htmlSnapshot?.trim()) {
    return NextResponse.json(
      { error: "MISSING_FIELDS" },
      { status: 400 },
    );
  }

  try {
    // 若客戶端提供合法的 templateId 則使用，否則 fallback 到 default
    let templateRow: { id: string } | undefined;
    if (clientTemplateId) {
      templateRow = db
        .prepare("SELECT id FROM Template WHERE id = ? LIMIT 1")
        .get(clientTemplateId) as { id: string } | undefined;
    }
    if (!templateRow) {
      templateRow = db
        .prepare("SELECT id FROM Template WHERE name = ? LIMIT 1")
        .get("default") as { id: string } | undefined;
    }
    if (!templateRow) {
      const id = randomUUID();
      db.prepare("INSERT INTO Template (id, name, cssContent, configJson) VALUES (?, ?, '', '{}')").run(id, "default");
      templateRow = { id };
    }
    const templateId = templateRow.id;

    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "post";
    let slug = `${slugBase}-${Date.now().toString(36)}`;
    // 確保 slug 唯一，避免 UNIQUE 失敗導致 500
    let suffix = 0;
    while (
      db
        .prepare("SELECT 1 FROM Post WHERE slug = ? LIMIT 1")
        .get(slug)
    ) {
      suffix += 1;
      slug = `${slugBase}-${Date.now().toString(36)}-${suffix}`;
    }

    // 清理 HTML 中的空圖片標籤後再寫入資料庫
    const cleanHtml = sanitizeHtml(htmlSnapshot);

    // 欄位對應 schema：id, slug, title, contentJson, htmlSnapshot, cssSnapshot, createdAt, templateId
    db.prepare(
      `
      INSERT INTO Post (id, slug, title, contentJson, htmlSnapshot, cssSnapshot, createdAt, templateId)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `,
    ).run(randomUUID(), slug, title.trim(), contentJson, cleanHtml, cssSnapshot ?? "", templateId);

    const newPost = db
      .prepare("SELECT id FROM Post WHERE slug = ? LIMIT 1")
      .get(slug) as { id: string } | undefined;

    return NextResponse.json({ ok: true, slug, id: newPost?.id }, { status: 201 });
  } catch (error) {
    console.error("[posts] create error", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

