import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

type SizeKey = "large" | "small" | "thumb";

const SIZES: Record<SizeKey, number> = {
  large: 1200,
  small: 600,
  thumb: 150,
};

export async function POST(request: NextRequest) {
  try {
    // 確保 uploads 根目錄存在
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });

    const formData = await request.formData();
    const file = formData.get("file");
    const alt = (formData.get("alt") as string | null) ?? null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "FILE_REQUIRED" },
        { status: 400 },
      );
    }

    const originalName = file.name || "upload";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const dir = path.join(UPLOAD_ROOT, year, month);
    await fs.mkdir(dir, { recursive: true });

    const baseName =
      path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_") ||
      "image";
    const timestamp = now.getTime();

    const paths: Record<SizeKey, string> = {
      large: "",
      small: "",
      thumb: "",
    };

    await Promise.all(
      (Object.keys(SIZES) as SizeKey[]).map(async (key) => {
        const width = SIZES[key];
        const fileName = `${baseName}-${key}-${timestamp}.webp`;
        const filePath = path.join(dir, fileName);

        await sharp(buffer)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filePath);

        paths[key] = path
          .join("/uploads", year, month, fileName)
          .replace(/\\/g, "/");
      }),
    );

    const id = randomUUID();

    db.prepare(
      `
      INSERT INTO Media (id, originalName, altText, pathJson)
      VALUES (@id, @originalName, @altText, @pathJson)
    `,
    ).run({
      id,
      originalName,
      altText: alt,
      pathJson: JSON.stringify(paths),
    });

    return NextResponse.json(
      {
        id,
        originalName,
        altText: alt,
        paths,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[media/upload] unexpected error", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

