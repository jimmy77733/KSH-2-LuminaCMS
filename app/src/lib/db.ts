import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { getDefaultCss, getDarkCss, getMinimalCss } from "./templates/default";

const globalForDb = globalThis as unknown as {
  luminaDb?: Database.Database;
};

// ─── 自動 Migration ────────────────────────────────────────────────────────────

function migrateDb(db: Database.Database) {
  // 為 Template 資料表增補新欄位（若已存在則略過）
  const alterCols = [
    "ALTER TABLE Template ADD COLUMN cssContent TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE Template ADD COLUMN configJson TEXT NOT NULL DEFAULT '{}'",
  ];
  for (const sql of alterCols) {
    try {
      db.exec(sql);
    } catch {
      // SQLite 不支援 ADD COLUMN IF NOT EXISTS，catch 代表欄位已存在
    }
  }

  // 內建模板定義
  const builtIn = [
    {
      name: "default",
      displayName: "預設 Apple 風格",
      description: "簡潔 Apple 設計語言，白色卡片 + 毛玻璃導覽列",
      preview: "#F5F5F7",
      getCss: getDefaultCss,
    },
    {
      name: "dark",
      displayName: "深色模式",
      description: "暗黑系版面，高對比色調，適合夜間閱讀",
      preview: "#1c1c1e",
      getCss: getDarkCss,
    },
    {
      name: "minimal",
      displayName: "極簡閱讀",
      description: "純白 serif 字體版面，去除裝飾，聚焦長文閱讀",
      preview: "#ffffff",
      getCss: getMinimalCss,
    },
  ] as const;

  const insertTemplate = db.prepare(
    "INSERT INTO Template (id, name, cssContent, configJson) VALUES (?, ?, ?, ?)",
  );
  const updateTemplate = db.prepare(
    "UPDATE Template SET cssContent = ?, configJson = ? WHERE id = ?",
  );

  for (const t of builtIn) {
    const existing = db
      .prepare("SELECT id, cssContent FROM Template WHERE name = ? LIMIT 1")
      .get(t.name) as { id: string; cssContent: string } | undefined;

    const configJson = JSON.stringify({
      displayName: t.displayName,
      description: t.description,
      preview: t.preview,
    });
    const cssContent = t.getCss();

    if (!existing) {
      insertTemplate.run(randomUUID(), t.name, cssContent, configJson);
    } else if (!existing.cssContent) {
      updateTemplate.run(cssContent, configJson, existing.id);
    }
  }
}

// ─── 建立連線 ──────────────────────────────────────────────────────────────────

function createDb() {
  const dbPath = path.join(process.cwd(), "dev.db");
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  migrateDb(db);
  return db;
}

export const db: Database.Database =
  globalForDb.luminaDb ?? createDb();

if (!globalForDb.luminaDb) {
  globalForDb.luminaDb = db;
}
