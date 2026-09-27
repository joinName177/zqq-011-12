/**
 * 稳定内容摘要（FNV-1a 32 位）。
 * 同一输入在任何一次渲染 / 导出中都得到同一 8 位十六进制校验码，
 * 用于图编号与导出文本的完整性校验。
 */
export function computeDigest(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
