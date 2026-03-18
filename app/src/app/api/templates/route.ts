import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type TemplateRow = {
  id: string;
  name: string;
  cssContent: string;
  configJson: string;
};

export async function GET() {
  try {
    const rows = db
      .prepare(
        "SELECT id, name, cssContent, configJson FROM Template ORDER BY rowid ASC",
      )
      .all() as TemplateRow[];

    const templates = rows.map((row) => {
      let config: Record<string, string> = {};
      try {
        config = JSON.parse(row.configJson || "{}") as Record<string, string>;
      } catch {
        // ignore malformed JSON
      }
      return {
        id: row.id,
        name: row.name,
        cssContent: row.cssContent,
        displayName: config.displayName ?? row.name,
        description: config.description ?? "",
        preview: config.preview ?? "#F5F5F7",
      };
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("[templates] fetch error", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
