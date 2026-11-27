import {readFile} from 'node:fs/promises';
import {fail} from '../../../platform/errors.ts';

/** DSH can rotate the endpoint and token across restarts while the stdio client stays open. */
export function openReaderConnection(file: string) {
  async function descriptor() {
    let value;
    try {
      value = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
    } catch {
      fail('CONNECTION_UNAVAILABLE', '无法读取催更姬连接配置，请检查连接是否已创建或撤销');
    }
    let address;
    try { address = new URL(value.endpoint); }
    catch { fail('INVALID_CONNECTION', '外部 MCP 连接地址无效'); }
    if (value.format !== 'cuigengji-mcp-connection' || value.version !== 1 || address.protocol !== 'http:'
      || address.hostname !== '127.0.0.1' || !address.port || address.username || address.password
      || address.search || address.hash || address.pathname !== '/' || typeof value.token !== 'string' || !/^[a-f0-9]{64}$/.test(value.token)) {
      fail('INVALID_CONNECTION', '需要有效的本机 MCP 连接配置');
    }
    return {endpoint: address.origin, token: value.token};
  }

  async function request(path: string, body?: unknown, signal?: AbortSignal) {
    const {endpoint, token} = await descriptor();
    const headers: Record<string, string> = {authorization: `Bearer ${token}`};
    if (body !== undefined) headers['content-type'] = 'application/json';
    const timeout = AbortSignal.timeout(30_000);
    let response;
    try {
      response = await fetch(endpoint + path, {
        method: body === undefined ? 'GET' : 'POST', headers, body: JSON.stringify(body),
        redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch {
      signal?.throwIfAborted();
      fail('HOST_UNAVAILABLE', '无法连接催更姬。请启动配置此连接的 DSH，并确认插件已启用');
    }
    let result;
    try { result = await response.json(); }
    catch { fail('HOST_PROTOCOL_ERROR', '催更姬连接返回了无效响应'); }
    if (!response.ok || !result.ok) {
      throw Object.assign(new Error(result.error?.message || '催更姬查询失败'), result.error || {code:'QUERY_FAILED'});
    }
    return result.value;
  }
  return {request};
}
