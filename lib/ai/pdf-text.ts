export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: true });
  const text = extracted.text;
  return (Array.isArray(text) ? text.join("\n") : text).replace(/\u0000/g, "").trim();
}
