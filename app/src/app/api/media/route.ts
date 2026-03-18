import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { db } from "@/lib/db";

const UPLOAD_ROOT = path.join(process.cwd(), "public");

export async function GET() {
  const rows = db
    .prepare(
      `
      SELECT id, originalName, altText, pathJson
      FROM Media
      ORDER BY rowid DESC
    `,
    )
    .all() as {
    id: string;
    originalName: string;
    altText: string | null;
    pathJson: string;
  }[];

  const result = rows.map((item) => ({
    id: item.id,
    originalName: item.originalName,
    altText: item.altText,
    paths: safeParsePaths(item.pathJson),
  }));

  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const media = db
    .prepare(
      `
      SELECT id, originalName, altText, pathJson
      FROM Media
      WHERE id = ?
      LIMIT 1
    `,
    )
    .get(id) as
    | {
        id: string;
        originalName: string;
        altText: string | null;
        pathJson: string;
      }
    | undefined;

  if (!media) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const paths = safeParsePaths(media.pathJson);

  // 刪除實體檔案
  const filePaths = [paths.large, paths.small, paths.thumb].filter(Boolean);
  await Promise.all(
    filePaths.map(async (p) => {
      const fsPath = path.join(UPLOAD_ROOT, p.replace(/^\//, ""));
      try {
        await fs.unlink(fsPath);
      } catch {
        // 若檔案不存在就略過
      }
    }),
  );

  db.prepare(`DELETE FROM Media WHERE id = ?`).run(id);

  return NextResponse.json({ ok: true });
}

function safeParsePaths(
  json: string | null | undefined,
): { large: string; small: string; thumb: string } {
  if (!json) {
    return { large: "", small: "", thumb: "" };
  }
  try {
    const parsed = JSON.parse(json);
    return {
      large: parsed.large ?? "",
      small: parsed.small ?? "",
      thumb: parsed.thumb ?? "",
    };
  } catch {
    return { large: "", small: "", thumb: "" };
  }
}

