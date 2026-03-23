function collapseBlankLines(value: string) {
  return value.replace(/\n{3,}/g, "\n\n");
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ");
}

function mergeBrokenLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function cleanResumeText(sourceText: string) {
  const normalizedText = normalizeWhitespace(sourceText).trim();
  const mergedText = mergeBrokenLines(normalizedText);
  return collapseBlankLines(mergedText).trim();
}
