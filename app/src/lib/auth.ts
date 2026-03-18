import { cookies } from "next/headers";
import crypto from "crypto";

type SessionPayload = {
  username: string;
  role: string;
};

const SESSION_COOKIE_NAME = "lumina_session";

function getSecret() {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

function sign(value: string) {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(value);
  return hmac.digest("hex");
}

export function createSessionCookie(payload: SessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(data);
  return `${data}.${signature}`;
}

export function verifySessionCookie(
  cookieValue: string | undefined,
): SessionPayload | null {
  if (!cookieValue) return null;
  const [data, signature] = cookieValue.split(".");
  if (!data || !signature) return null;
  const expected = sign(data);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const json = Buffer.from(data, "base64url").toString("utf8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookie(value);
}

export async function setSessionCookie(payload: SessionPayload) {
  const cookieStore = await cookies();
  const value = createSessionCookie(payload);
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

