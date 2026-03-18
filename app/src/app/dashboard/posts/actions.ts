"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function deletePostAction(id: string) {
  if (!id) return;
  db.prepare("DELETE FROM Post WHERE id = ?").run(id);
  revalidatePath("/dashboard/posts");
}
