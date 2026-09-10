declare module 'mammoth' {
  export interface ExtractionResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<ExtractionResult>;
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<ExtractionResult>;
}
