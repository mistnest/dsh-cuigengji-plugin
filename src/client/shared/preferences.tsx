import React,{useRef,useState} from 'react';
import manifest from '../../../package.json' with { type: 'json' };
import aboutSticker from '../assets/haoye.png';
import {Modal} from './Modal.tsx';
import {Icon} from './icons.tsx';
import {useWorkbenchPreferences,type Preferences} from './settings/preferences-state.tsx';
export {Modal} from './Modal.tsx';
export {PreferencesProvider,useWorkbenchPreferences,defaults,type Preferences} from './settings/preferences-state.tsx';
export {SettingsDialog as PreferencesDialog} from './settings/SettingsDialog.tsx';
export function ProseDisplay() {
  const {preferences:p, update} = useWorkbenchPreferences();
  return <details className="menu prose-display"><summary aria-label="正文显示设置"><span aria-hidden="true">Aa</span>显示</summary><div className="menu-panel">
    <label>字号<select aria-label="正文字号" value={p.fontSize} onChange={event=>update({fontSize:Number(event.target.value)})}>{[16,18,20,22].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
    <label>行距<select aria-label="当前正文行距" value={p.leading} onChange={event=>update({leading:Number(event.target.value)})}><option value={1.7}>紧凑</option><option value={1.95}>适中</option><option value={2.2}>宽松</option></select></label>
  </div></details>;
}
export function AboutDialog({close}: {close: () => void}) {
  const [copyStatus, setCopyStatus] = useState('');
  const groupNumber = useRef<HTMLElement>(null);
  const copyGroup = async () => {
    try {
      await navigator.clipboard.writeText('1026457465');
      setCopyStatus('群号已复制');
    } catch {
      const selection = window.getSelection();
      if (groupNumber.current && selection) {
        const range = document.createRange();
        range.selectNodeContents(groupNumber.current);
        selection.removeAllRanges(); selection.addRange(range);
      }
      setCopyStatus('可选中群号，按 Ctrl+C 复制。');
    }
  };
  return <Modal title="关于催更姬" close={close} className="about-modal">
    <section className="about-overview">
      <div>
        <div className="about-identity"><h2>催更姬</h2><span className="about-version">v{manifest.version}</span></div>
        <p className="about-tagline">让大肥鱼成为你的小说写作助手。</p>
      </div>
      <img className="about-sticker" src={aboutSticker} width={384} height={384} alt="好耶！紫发少女的欢呼贴纸"/>
      <p className="about-description">为 DSH 打造的小说写作插件。把正文、情节规划、人物与世界设定放在同一个工作台，让你和 AI 一起讨论、整理并推进故事。</p>
    </section>
    <div className="about-contacts" aria-label="交流与支持">
      <button type="button" className="about-contact" onClick={copyGroup} aria-label="复制交流群号 1026457465" title="复制群号">
        <span className="about-contact-label">交流群</span><strong ref={groupNumber}>1026457465</strong><span className="about-contact-mark" aria-hidden="true">{copyStatus === '群号已复制' ? '✓' : '⧉'}</span>
      </button>
      <a className="about-contact" href="https://ifdian.net/a/cuigengji" target="_blank" rel="noopener noreferrer">
        <span className="about-contact-label">爱发电</span><strong>支持催更姬</strong><span className="about-contact-mark" aria-hidden="true">↗</span>
      </a>
      <a className="about-contact" href="https://github.com/mistnest/dsh-cuigengji-plugin" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 给催更姬点个 Star（打开项目页面）">
        <span className="about-contact-label">GitHub</span><span className="about-contact-copy"><strong className="about-star-title"><Icon name="star"/>给催更姬点个 Star</strong><small>登录 GitHub 后，点击项目页右上角 Star。</small></span><span className="about-contact-mark" aria-hidden="true">↗</span>
      </a>
    </div>
    <p className="about-copy-status" role="status">{copyStatus}</p>
    <footer className="about-welcome"><p>欢迎交流、合作与投喂。</p><p>每一份支持都会化作开发所需的 Token，让催更姬更新得更快一点。</p></footer>
  </Modal>;
}
