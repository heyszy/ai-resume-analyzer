import { get } from "@vercel/blob";
import { PDFParse } from "pdf-parse";

import { AnalysisError } from "./errors";

async function readPrivateBlob(pathname: string) {
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new AnalysisError("BLOB_READ_FAILED", "未找到对应的简历文件。", {
        pathname,
      });
    }

    return Buffer.from(await new Response(result.stream).arrayBuffer());
  } catch (error) {
    if (error instanceof AnalysisError) {
      throw error;
    }

    throw new AnalysisError("BLOB_READ_FAILED", "读取简历文件失败。", {
      pathname,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function parseCandidatePdf(pathname: string) {
  const fileBuffer = await readPrivateBlob(pathname);

  try {
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text?.trim() ?? "";
    const pageCount = Number(result.total ?? 0);

    if (!text) {
      throw new AnalysisError(
        "UNSUPPORTED_SCANNED_PDF",
        "当前 PDF 未提取到可用文本，本轮暂不支持扫描件 OCR。",
        {
          pathname,
          pageCount,
        },
      );
    }

    return {
      sourceText: text,
      pageCount,
    };
  } catch (error) {
    if (error instanceof AnalysisError) {
      throw error;
    }

    throw new AnalysisError("PDF_TEXT_EXTRACTION_FAILED", "解析 PDF 文本失败。", {
      pathname,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
