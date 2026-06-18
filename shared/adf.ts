const BLOCK_NODE_TYPES = new Set([
  "blockquote",
  "bulletList",
  "codeBlock",
  "doc",
  "heading",
  "listItem",
  "mediaGroup",
  "orderedList",
  "panel",
  "paragraph",
  "rule",
  "table",
  "tableCell",
  "tableHeader",
  "tableRow"
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readAttributeText = (node: Record<string, unknown>) => {
  if (!isRecord(node.attrs)) {
    return "";
  }

  const text = node.attrs.text ?? node.attrs.shortName ?? node.attrs.name;
  return typeof text === "string" ? text : "";
};

const collectAdfText = (node: unknown, parts: string[]) => {
  if (!node) {
    return;
  }

  if (typeof node === "string") {
    parts.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectAdfText(child, parts);
    }
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  if (node.type === "hardBreak") {
    parts.push("\n");
    return;
  }

  if (typeof node.text === "string") {
    parts.push(node.text);
  } else {
    const attributeText = readAttributeText(node);

    if (attributeText) {
      parts.push(attributeText);
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectAdfText(child, parts);
    }
  }

  if (typeof node.type === "string" && BLOCK_NODE_TYPES.has(node.type)) {
    parts.push("\n");
  }
};

export const adfToPlainText = (node: unknown) => {
  const parts: string[] = [];
  collectAdfText(node, parts);

  return parts.join("").replace(/\s+/g, " ").trim();
};
