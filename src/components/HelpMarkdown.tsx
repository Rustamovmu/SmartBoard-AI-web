import Markdown, { defaultUrlTransform } from "react-markdown";
export function safeHelpUrl(value: string) {
  if (!value) return "";
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127 || value[index] === "\\") return "";
  }
  const safe = defaultUrlTransform(value);
  if (!safe || safe.startsWith("//")) return "";
  if (safe.startsWith("#") || safe.startsWith("/")) return safe;
  try {
    const url = new URL(safe);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? safe
      : "";
  } catch {
    return "";
  }
}
export function HelpMarkdown({ body }: { body: string }) {
  return (
    <div className="help-markdown">
      <Markdown
        skipHtml
        urlTransform={safeHelpUrl}
        allowedElements={[
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ul",
          "ol",
          "li",
          "strong",
          "em",
          "blockquote",
          "pre",
          "code",
          "a",
          "hr",
          "br",
        ]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ href, children }) =>
            href ? (
              <a href={href} rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
