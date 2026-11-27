import type {TransferFile, DownloadFile} from '../../../../workspace/transfer/types.ts';

export async function readTransferFile(file: File): Promise<TransferFile> {
  if (file.size > 64 * 1024 * 1024) throw new Error('文件超过 64 MB，请拆分后导入');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.png$/i.test(file.name)) {
    if (file.size > 20 * 1024 * 1024) throw new Error('角色卡 PNG 超过 20 MB');
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return {name: file.name, pngBase64: btoa(binary)};
  }
  let text: string;
  try {text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);}
  catch {if (!/\.(txt|md)$/i.test(file.name)) throw new Error('JSON 文件需要使用 UTF-8 编码'); text = new TextDecoder('gb18030', {fatal: true}).decode(bytes);}
  return {name: file.name, text};
}
export function downloadFile(value: DownloadFile) {
  const url = URL.createObjectURL(new Blob([value.content], {type: value.mime})), anchor = document.createElement('a');
  anchor.href = url; anchor.download = value.filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
