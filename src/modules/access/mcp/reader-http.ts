import http from 'node:http';
import type {AddressInfo} from 'node:net';
import {errorInfo, fail} from '../../../platform/errors.ts';
import type {AuthorizeReader, ReaderTransport} from '../../collaboration/grants/service.ts';

const postRoutes = {'/reader/open':'open', '/reader/status':'status', '/query':'query','/write':'write'} as const;

async function readBody(request: http.IncomingMessage, limit: number): Promise<Record<string, unknown>> {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') fail('INVALID_INPUT','请求须为 JSON');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) fail('INVALID_INPUT','请求内容过大');
    chunks.push(chunk);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_INPUT','查询参数须为对象');
  return body;
}

/** Wire protocol for the stdio client. Grant decisions stay on the service. */
export function createReaderTransport(authorize: AuthorizeReader): ReaderTransport {
  let endpoint = '', closed = false;
  let server: http.Server | undefined;
  let opening: Promise<string> | undefined;
  async function handle(request: http.IncomingMessage, response: http.ServerResponse) {
    const reply = (status: number, body: unknown) => {
      response.writeHead(status, {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store'});
      response.end(JSON.stringify(body));
    };
    try {
      if (request.headers.host !== endpoint.slice('http://'.length)) fail('UNAUTHORIZED','外部连接地址无效');
      const reader = await authorize((request.headers.authorization || '').replace(/^Bearer /,''));
      if (request.method === 'GET' && request.url === '/capabilities') {
        return reply(200,{ok:true,value:await reader.invoke('capabilities', {})});
      }
      const path = request.url || '';
      if (request.method !== 'POST' || !Object.hasOwn(postRoutes, path)) fail('READ_ONLY','此连接未开放该入口');
      const operation = postRoutes[path as keyof typeof postRoutes];
      const body = await readBody(request, operation === 'write' ? 1536 * 1024 : 256 * 1024);
      reply(200,{ok:true,value:await reader.invoke(operation, body)});
    } catch (error) {
      const diagnostic = errorInfo(error);
      reply(diagnostic.code === 'UNAUTHORIZED' ? 401 : 400, {ok:false,error:diagnostic});
    }
  }
  return {
    async listen() {
      if (closed) fail('EXTERNAL_CLOSED','外部连接服务已关闭');
      if (endpoint) return endpoint;
      if (!opening) {
        const listener = http.createServer((req, res) => {void handle(req, res);});
        listener.requestTimeout = 30000;
        listener.headersTimeout = 15000;
        opening = new Promise<string>((done, reject) => {
          listener.once('error', reject);
          listener.listen(0, '127.0.0.1', () => {
            listener.off('error', reject);
            server = listener;
            endpoint = 'http://127.0.0.1:' + (listener.address() as AddressInfo).port;
            done(endpoint);
          });
        }).finally(() => {opening = undefined;});
      }
      return opening;
    },
    async close() {
      closed = true;
      await opening?.catch(() => {});
      const listener = server;
      if (!listener) return;
      server = undefined;
      listener.closeAllConnections();
      await new Promise<void>(done => listener.close(() => done()));
    },
  };
}
