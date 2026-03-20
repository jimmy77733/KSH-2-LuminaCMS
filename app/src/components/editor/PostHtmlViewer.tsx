"use client";

interface PostHtmlViewerProps {
  html: string;
}

export function PostHtmlViewer({ html }: PostHtmlViewerProps) {
  return (
    <iframe
      srcDoc={html}
      className="w-full"
      style={{ height: "calc(100vh - 48px)", border: "none", display: "block" }}
      sandbox="allow-scripts allow-same-origin"
      title="文章預覽"
    />
  );
}
