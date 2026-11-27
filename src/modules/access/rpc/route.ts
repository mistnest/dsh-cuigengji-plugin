import type {Context} from '@deepseek-ai/cordis';
import {createHumanDispatcher, failure, invalid, record, type HumanServices} from './human-actions.ts';
export const RPC_ENDPOINT = 'cuigengji/dispatch';
const RPC_PATH = '/api/' + RPC_ENDPOINT;

export function registerRpcRoute(ctx: Context, services: HumanServices) {
  const dispatchRpc = createHumanDispatcher(ctx, services);
  // The backend connection is supplied by the host (declared in the plugin's inject list).
  const {connection} = ctx as Context & {connection: {fetch: {register(route: {
    path: string; methods: string[]; requestBody: 'buffered'; fetch(request: Request): Promise<Response>
  }): void}}};
  connection.fetch.register({
    path: RPC_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async request => {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return new Response('content type must be application/json', { status: 415 });
      }
      let message;
      try {
        message = await request.json();
      } catch {
        return new Response('body is not JSON', { status: 400 });
      }
      const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request';
      if (!record(message) || message.type !== 'client-request' || message.method !== RPC_ENDPOINT || typeof message.rpcId !== 'string' || !message.rpcId.trim()) {
        return Response.json({
          type: 'server-response',
          rpcId,
          result: failure(invalid('无效的 RPC 请求')),
        });
      }
      return Response.json({
        type: 'server-response',
        rpcId,
        result: await dispatchRpc(message.payload, request.signal),
      });
    },
  });
}
