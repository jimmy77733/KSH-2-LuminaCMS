/**
 * 清理 HTML snapshot：移除 src 為空的 <img> 及其外包 <picture> 區塊
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(
      /<picture>[\s\S]*?<img\s[^>]*src\s*=\s*["']\s*["'][^>]*>[\s\S]*?<\/picture>/gi,
      "",
    )
    .replace(/<img\s[^>]*src\s*=\s*["']\s*["'][^>]*/gi, "")
    .trim();
}
