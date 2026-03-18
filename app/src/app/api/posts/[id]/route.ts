import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM Post WHERE id = ? LIMIT 1")
    .get(id) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  db.prepare("DELETE FROM Post WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const post = db
    .prepare(
      "SELECT id, slug, title, contentJson, htmlSnapshot, cssSnapshot, templateId, createdAt FROM Post WHERE id = ? LIMIT 1",
    )
    .get(id) as
    | {
        id: string;
        slug: string;
        title: string;
        contentJson: string;
        htmlSnapshot: string;
        cssSnapshot: string;
        templateId: string;
        createdAt: string;
      }
    | undefined;

  if (!post) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { title, contentJson, htmlSnapshot, cssSnapshot, templateId } = body as {
    title?: string;
    contentJson?: string;
    htmlSnapshot?: string;
    cssSnapshot?: string;
    templateId?: string;
  };

  if (!title?.trim() || !contentJson || !htmlSnapshot?.trim()) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM Post WHERE id = ? LIMIT 1")
    .get(id) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const cleanHtml = sanitizeHtml(htmlSnapshot);

    // 若有提供合法的 templateId 則更新，否則維持原值
    let resolvedTemplateId: string | undefined;
    if (templateId) {
      const tRow = db
        .prepare("SELECT id FROM Template WHERE id = ? LIMIT 1")
        .get(templateId) as { id: string } | undefined;
      if (tRow) resolvedTemplateId = tRow.id;
    }

    if (resolvedTemplateId) {
      db.prepare(
        `UPDATE Post SET title = ?, contentJson = ?, htmlSnapshot = ?, cssSnapshot = ?, templateId = ? WHERE id = ?`,
      ).run(title.trim(), contentJson, cleanHtml, cssSnapshot ?? "", resolvedTemplateId, id);
    } else {
      db.prepare(
        `UPDATE Post SET title = ?, contentJson = ?, htmlSnapshot = ?, cssSnapshot = ? WHERE id = ?`,
      ).run(title.trim(), contentJson, cleanHtml, cssSnapshot ?? "", id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[posts/update] error", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
