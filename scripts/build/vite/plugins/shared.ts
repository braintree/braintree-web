import * as cheerio from "cheerio";

const CHEERIO_CONFIG = { xmlMode: false, decodeEntities: false };

export interface HtmlAsset {
  type: string;
  fileName?: string;
  source: string | Uint8Array;
}

export interface BundleChunk {
  type: string;
  code?: string;
  fileName?: string;
}

export interface EmittedFile {
  type: string;
  fileName: string;
  source: string;
}

export function loadHtml(source: string) {
  return cheerio.load(source, CHEERIO_CONFIG);
}
