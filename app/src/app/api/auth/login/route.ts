import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));

  if (!username || !password) {
    return NextResponse.json(
      { error: "USERNAME_AND_PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  try {
    const row = db
      .prepare(
        `
        SELECT u.id, u.username, u.passwordHash, r.name as roleName
        FROM User u
        JOIN Role r ON u.roleId = r.id
        WHERE u.username = ?
        LIMIT 1
      `,
      )
      .get(username) as
      | {
          id: string;
          username: string;
          passwordHash: string;
          roleName: string;
        }
      | undefined;

    if (!row) {
      console.warn("[auth/login] user not found", { username });
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, row.passwordHash);
    if (!ok) {
      console.warn("[auth/login] invalid password", { username });
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    await setSessionCookie({
      username: row.username,
      role: row.roleName,
    });

    return NextResponse.json({
      username: row.username,
      role: row.roleName,
    });
  } catch (error) {
    console.error("[auth/login] unexpected error", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}



