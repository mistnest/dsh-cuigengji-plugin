import { createHumanDispatcher, failure, invalid, record } from "./human-actions.js";
const RPC_ENDPOINT = "cuigengji/dispatch";
const RPC_PATH = "/api/" + RPC_ENDPOINT;
function registerRpcRoute(ctx, services) {
  const dispatchRpc = createHumanDispatcher(ctx, services);
  const { connection } = ctx;
  connection.fetch.register({
    path: RPC_PATH,
    methods: ["POST"],
    requestBody: "buffered",
    fetch: async (request) => {
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return new Response("content type must be application/json", { status: 415 });
      }
      let message;
      try {
        message = await request.json();
      } catch {
        return new Response("body is not JSON", { status: 400 });
      }
      const rpcId = typeof message?.rpcId === "string" ? message.rpcId : "invalid-request";
      if (!record(message) || message.type !== "client-request" || message.method !== RPC_ENDPOINT || typeof message.rpcId !== "string" || !message.rpcId.trim()) {
        return Response.json({
          type: "server-response",
          rpcId,
          result: failure(invalid("\u65E0\u6548\u7684 RPC \u8BF7\u6C42"))
        });
      }
      return Response.json({
        type: "server-response",
        rpcId,
        result: await dispatchRpc(message.payload, request.signal)
      });
    }
  });
}
export {
  RPC_ENDPOINT,
  registerRpcRoute
};
