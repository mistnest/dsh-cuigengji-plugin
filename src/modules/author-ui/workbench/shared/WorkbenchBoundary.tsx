import React from 'react';

/** Keep an isolated view failure inside the plugin. DSH retires a keyed slot
 * after an uncaught render error, leaving it unavailable until page reload. */
export class WorkbenchBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}> {
  state:{error:Error|null}={error:null};
  static getDerivedStateFromError(error:unknown) {return {error:error instanceof Error?error:new Error(String(error))};}
  componentDidCatch(error:Error,info:React.ErrorInfo) {console.error('[cuigengji] workbench render failed',error,info.componentStack);}
  render() {
    const error=this.state.error;
    if(!error)return this.props.children;
    return <section role="alert" aria-label="催更姬界面异常" style={{boxSizing:'border-box',height:'100%',overflow:'auto',padding:28,background:'var(--dsw-alias-bg-base,#fff)',color:'var(--dsw-alias-label-primary,#252936)',font:'14px/1.8 system-ui'}}>
      <h2 style={{margin:'0 0 10px',fontSize:18}}>工作台暂时无法显示</h2>
      <p style={{margin:'0 0 20px'}}>请重新打开工作台，继续刚才的操作。</p>
      <button type="button" onClick={()=>this.setState({error:null})} style={{border:0,borderRadius:8,padding:'9px 16px',background:'var(--dsw-alias-state-business-primary,#4d6bfe)',color:'#fff',font:'inherit',cursor:'pointer'}}>重新打开工作台</button>
      <details style={{marginTop:20,color:'var(--dsw-alias-label-secondary,#737780)'}}><summary>错误详情</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',font:'12px/1.7 monospace'}}>{error.message}</pre></details>
    </section>;
  }
}
