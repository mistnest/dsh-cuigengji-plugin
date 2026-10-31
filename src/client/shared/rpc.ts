type RpcResult = {ok:true;value:unknown}|{ok:false;error:{code:string;message:string;details?:Record<string,unknown>}};
type Transport = (action:string,args:Record<string,unknown>,sessionId?:string,signal?:AbortSignal)=>Promise<RpcResult>;
interface Options {signal?:AbortSignal;retryWindowMs?:number;retryDelayMs?:number}
const startupReads = new Set(['novel.list','binding.get','settings.get','maintenance.status']);
const unavailableRoute = /^transport failure for \/api\/cuigengji\/dispatch: HTTP (404|503)$/;

function wait(milliseconds:number,signal?:AbortSignal) {
  return new Promise<void>((resolve,reject)=>{
    signal?.throwIfAborted();
    const aborted=()=>{clearTimeout(timer);reject(signal?.reason);};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);resolve();},milliseconds);
    signal?.addEventListener('abort',aborted,{once:true});
  });
}

/** Native installation exposes the client independently of the server fiber.
 * Recover only safe bootstrap reads, never replay a mutation after a transport
 * failure. Disposal cancels both pending requests and the bounded retry loop. */
export function createWorkbenchRPC(transport:Transport,{signal,retryWindowMs=60_000,retryDelayMs=250}:Options={}) {
  return async(action:string,args:Record<string,unknown>,sessionId?:string):Promise<any>=>{
    const deadline=Date.now()+retryWindowMs;
    for(let attempt=0;;attempt++) {
      signal?.throwIfAborted();
      let result:RpcResult;
      try {result=await transport(action,args,sessionId,signal);}
      catch(error) {
        signal?.throwIfAborted();
        const status=error instanceof Error?unavailableRoute.exec(error.message):null;
        if(!startupReads.has(action)||!status)throw error;
        const remaining=deadline-Date.now();
        if(remaining<=0)throw Object.assign(new Error(`催更姬后端尚未就绪（HTTP ${status[1]}）。请重试；若仍失败，请确认插件已启用，并完整退出 DSH（包括托盘）后重新打开。`,{cause:error}),{code:'BACKEND_UNAVAILABLE'});
        await wait(Math.min(remaining,retryDelayMs*2**Math.min(attempt,3)),signal);
        continue;
      }
      if(!result.ok)throw Object.assign(new Error(result.error.message),{code:result.error.code,details:result.error.details||{}});
      return result.value;
    }
  };
}
