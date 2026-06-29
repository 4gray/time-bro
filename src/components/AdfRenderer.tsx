import type { ReactNode } from "react";

interface AdfRendererProps {
  document: unknown;
  fallback?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readTextAttr = (node: Record<string, unknown>) => {
  if (!isRecord(node.attrs)) {
    return "";
  }

  const text = node.attrs.text ?? node.attrs.shortName ?? node.attrs.name;
  return typeof text === "string" ? text : "";
};

const collectText = (node: unknown): string => {
  if (!node) {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }

  if (!isRecord(node)) {
    return "";
  }

  if (typeof node.text === "string") {
    return node.text;
  }

  const ownText = readTextAttr(node);
  const childText = Array.isArray(node.content) ? node.content.map(collectText).join("") : "";

  return ownText || childText;
};

const renderChildren = (content: unknown, keyPrefix: string): ReactNode[] => {
  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .map((child, index) => renderNode(child, `${keyPrefix}-${index}`))
    .filter((child): child is ReactNode => child !== null && child !== undefined && child !== "");
};

const withMarks = (node: Record<string, unknown>, rendered: ReactNode, key: string) => {
  if (!Array.isArray(node.marks)) {
    return rendered;
  }

  return node.marks.reduce<ReactNode>((child, mark, index) => {
    if (!isRecord(mark) || typeof mark.type !== "string") {
      return child;
    }

    const markKey = `${key}-mark-${index}`;

    if (mark.type === "strong") {
      return <strong key={markKey}>{child}</strong>;
    }

    if (mark.type === "em") {
      return <em key={markKey}>{child}</em>;
    }

    if (mark.type === "code") {
      return <code key={markKey}>{child}</code>;
    }

    if (mark.type === "strike") {
      return <s key={markKey}>{child}</s>;
    }

    if (mark.type === "underline") {
      return <u key={markKey}>{child}</u>;
    }

    if (mark.type === "link" && isRecord(mark.attrs) && typeof mark.attrs.href === "string") {
      return (
        <a key={markKey} href={mark.attrs.href} target="_blank" rel="noreferrer">
          {child}
        </a>
      );
    }

    return child;
  }, rendered);
};

const renderListItems = (node: Record<string, unknown>, key: string) =>
  Array.isArray(node.content)
    ? node.content.map((child, index) => {
        if (!isRecord(child) || child.type !== "listItem") {
          return renderNode(child, `${key}-item-${index}`);
        }

        return <li key={`${key}-item-${index}`}>{renderChildren(child.content, `${key}-item-${index}`)}</li>;
      })
    : [];

const renderNode = (node: unknown, key: string): ReactNode => {
  if (!node) {
    return null;
  }

  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node)) {
    return renderChildren(node, key);
  }

  if (!isRecord(node)) {
    return null;
  }

  const type = typeof node.type === "string" ? node.type : "";

  if (typeof node.text === "string") {
    return withMarks(node, node.text, key);
  }

  if (type === "hardBreak") {
    return <br key={key} />;
  }

  if (type === "doc") {
    return renderChildren(node.content, key);
  }

  if (type === "paragraph") {
    const children = renderChildren(node.content, key);
    return children.length ? <p key={key}>{children}</p> : null;
  }

  if (type === "heading") {
    const level = isRecord(node.attrs) && typeof node.attrs.level === "number" ? node.attrs.level : 3;
    const safeLevel = Math.min(Math.max(Math.round(level), 1), 6);
    const HeadingTag = `h${safeLevel}` as keyof JSX.IntrinsicElements;
    return <HeadingTag key={key}>{renderChildren(node.content, key)}</HeadingTag>;
  }

  if (type === "bulletList") {
    return <ul key={key}>{renderListItems(node, key)}</ul>;
  }

  if (type === "orderedList") {
    const start = isRecord(node.attrs) && typeof node.attrs.order === "number" ? node.attrs.order : undefined;
    return (
      <ol key={key} start={start}>
        {renderListItems(node, key)}
      </ol>
    );
  }

  if (type === "blockquote") {
    return <blockquote key={key}>{renderChildren(node.content, key)}</blockquote>;
  }

  if (type === "codeBlock") {
    return (
      <pre key={key}>
        <code>{collectText(node.content)}</code>
      </pre>
    );
  }

  if (type === "rule") {
    return <hr key={key} />;
  }

  const attrText = readTextAttr(node);
  if (attrText) {
    return attrText;
  }

  const children = renderChildren(node.content, key);
  return children.length ? children : collectText(node);
};

export const AdfRenderer = ({ document, fallback }: AdfRendererProps) => {
  const rendered = renderNode(document, "adf");

  if (!rendered || (Array.isArray(rendered) && rendered.length === 0)) {
    return fallback ? <p>{fallback}</p> : null;
  }

  return <div className="adf-renderer">{rendered}</div>;
};
