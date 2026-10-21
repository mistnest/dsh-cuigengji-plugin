/** Use the public DSH Workspace APIs. Existing conversations are never moved
 * or rewritten; this opens a new conversation rooted at the writing library. */
export async function openWritingLibrary(
  rpc:(action:string,args:object)=>Promise<{dataRoot:string}>,
  create:(input:{path:string})=>Promise<{workspaceId:string}>,
  open:(id:string,beforeOpen?:(sessionId:string)=>void)=>Promise<void>,
  beforeOpen?:(sessionId:string)=>void,
) {
  const status=await rpc('workspace.status',{});
  if(typeof status.dataRoot!=='string'||!status.dataRoot.trim())throw new Error('暂时无法读取小说作品库位置');
  const workspace=await create({path:status.dataRoot});
  await open(workspace.workspaceId,beforeOpen);
}
