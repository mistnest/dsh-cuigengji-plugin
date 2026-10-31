import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Row = Record<string, any>;
interface Options {
  supported?: boolean;
  launch?: () => ChildProcessWithoutNullStreams;
}
const moods = new Set(['idle', 'thinking', 'writing', 'waiting', 'sleepy', 'error']);

/** Device UI only: no novel bodies, network listener, or Agent tool exposure.
 * The transparent Windows process owns its own animation/message loop, so it
 * keeps working when the DSH WebView is minimized or its sidebar is unmounted. */
export class DesktopPet {
  private child: ChildProcessWithoutNullStreams | null = null;
  private starting: Promise<void> | null = null;
  private ready = false;
  private closed = false;
  private failed = '';
  private preferenceError = '';
  private sessionId = '';
  private preferences = { role: 'bigfish', visible: true, reduced: false };
  private loaded = false;
  private loading: Promise<void> | null = null;
  private revision = 0;
  private sequence = 0;
  private details: { sequence: number; sessionId: string } | null = null;
  private snapshot: Row = {};
  private poll: ReturnType<typeof setTimeout> | undefined;
  private reading: Promise<void> | null = null;
  private cancelRead: (() => void) | undefined;
  private generation = 0;
  private writes: Promise<void> = Promise.resolve();
  private supported: boolean;
  private launch: () => ChildProcessWithoutNullStreams;
  private root: string;
  private dispatch: (action: string, args: Row, actor: Row) => Promise<any>;
  constructor(root: string, dispatch: (action: string, args: Row, actor: Row) => Promise<any>, options: Options = {}) {
    this.root = root; this.dispatch = dispatch;
    // Newer DSH scopes the launcher variable to package installation. Its Host
    // still runs in Electron's Node mode; the client separately requires the desktop preload.
    this.supported = options.supported ?? (process.platform === 'win32' && Boolean(process.versions.electron || process.env.DSH_DESKTOP_NODE_EXECUTABLE));
    this.launch = options.launch || (() => spawn(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [
      '-NoLogo', '-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File',
      fileURLToPath(new URL('../../../src/desktop/pet.ps1', import.meta.url)),
      '-StateDirectory', this.root, '-AssetsDirectory', fileURLToPath(new URL('../../../src/client/assets/pets/', import.meta.url)), '-ParentProcessId', String(process.pid),
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }));
  }
  private async loadPreferences() {
    if (this.loaded) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const value = JSON.parse(await readFile(join(this.root, 'pet-desktop.json'), 'utf8'));
        if (value?.role === 'bigfish' || value?.role === 'cuigengji') this.preferences.role = value.role;
        if (typeof value?.visible === 'boolean') this.preferences.visible = value.visible;
        if (typeof value?.reduced === 'boolean') this.preferences.reduced = value.reduced;
        this.revision = 1;
      } catch (error: any) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) this.preferenceError = `桌宠偏好暂未读取：${error.message}`; }
      this.loaded = true;
    })().finally(() => { this.loading = null; });
    return this.loading;
  }
  private updatePreferences(value: Row) {
    const next = {
      role: value.role === 'cuigengji' ? 'cuigengji' : 'bigfish',
      visible: value.visible !== false, reduced: value.reduced === true,
    };
    if (JSON.stringify(next) === JSON.stringify(this.preferences)) return;
    this.preferences = next; this.revision++;
    if (!next.visible) { clearTimeout(this.poll); this.poll = undefined; }
    const saved = JSON.stringify(next);
    this.writes = this.writes.catch(() => {}).then(async () => {
      await mkdir(this.root, { recursive: true });
      const path = join(this.root, 'pet-desktop.json'), temporary = path + '.tmp';
      await writeFile(temporary, saved, { mode: 0o600 }); await rename(temporary, path);
      this.preferenceError = '';
    });
    // Rejections are reported to sync callers instead of becoming unhandled.
    void this.writes.catch(error => { this.preferenceError = `桌宠偏好暂未保存：${error.message}`; });
  }
  private send(extra: Row = {}) {
    if (this.child && this.ready && !this.child.stdin.destroyed) {
      this.child.stdin.write(JSON.stringify({ type: 'update', ...this.snapshot, ...this.preferences, sessionId: this.sessionId, ...extra }) + '\n');
    }
  }
  private start(): Promise<void> {
    if (this.closed || this.ready || this.failed) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = new Promise<void>(resolve => {
      let child: ChildProcessWithoutNullStreams;
      try { child = this.launch(); this.child = child; }
      catch (error: any) { this.failed = `桌面陪伴无法启动：${error.message}`; resolve(); return; }
      let settled = false, errors = '';
      const done = () => { if (settled) return; settled = true; clearTimeout(deadline); resolve(); };
      const fail = (message: string) => {
        if (this.child !== child && settled) return;
        this.ready = false; this.failed = message; clearTimeout(this.poll);
        if (this.child === child) this.child = null;
        done();
      };
      const deadline = setTimeout(() => { fail('桌面陪伴启动超时，已切回窗口内陪伴。'); child.kill(); }, 20_000);
      const lines = createInterface({ input: child.stdout });
      lines.on('line', line => {
        if (line.length > 8192 || this.child !== child || this.closed) return;
        try {
          const event = JSON.parse(line);
          if (event.type === 'ready' && event.protocol === 1) { this.ready = true; this.failed = ''; this.send(); done(); }
          else if (event.type === 'preferences') { this.updatePreferences({ ...this.preferences, ...event }); this.send(); }
          else if (event.type === 'details') this.details = { sequence: ++this.sequence, sessionId: this.sessionId };
        } catch { /* Ignore non-protocol diagnostics. */ }
      });
      child.stderr.on('data', chunk => { errors = (errors + String(chunk)).slice(-1600); });
      child.stdin.on('error', () => { /* exit/error handler owns the fallback */ });
      child.once('error', error => fail(`桌面陪伴无法启动：${error.message}`));
      child.once('exit', (code, signal) => {
        lines.close();
        if (this.child === child || !settled) fail(this.closed ? '' : `桌面陪伴已退出（${signal || (code ?? '未知')}）${errors ? '：' + errors.trim() : ''}`);
      });
    }).finally(() => { this.starting = null; });
    return this.starting;
  }
  private refresh(): Promise<void> {
    if (this.reading) return this.reading;
    const generation = this.generation, sessionId = this.sessionId;
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('progress timeout')), 20_000);
      this.cancelRead = () => reject(new Error('cancelled'));
    });
    const read = async () => {
      const binding = sessionId ? await this.dispatch('binding.get', {}, { kind: 'human', sessionId }) : null;
      if (generation !== this.generation || this.closed) return null;
      const novelId = binding?.activeNovelId || binding?.novelId;
      return this.dispatch('activity.today', novelId ? { novelId } : {}, { kind: 'human', sessionId });
    };
    this.reading = (async () => {
      try {
        const result = await Promise.race([read(), deadline]);
        if (!result || generation !== this.generation || this.closed) return;
        // The native bubble only needs one aggregate. Forwarding the full
        // per-book list can exceed the pipe protocol's line limit in a large
        // library, silently dropping every update until the scope changes.
        const { date, novelId, title, stats } = result;
        this.snapshot = { ...this.snapshot, activity: { date, novelId, title: typeof title === 'string' ? title.slice(0, 512) : null,
          stats: { proseAdded: stats.proseAdded, settingAdded: stats.settingAdded, planningChanges: stats.planningChanges } }, error: '' }; this.send();
      } catch {
        if (generation === this.generation && !this.closed) { this.snapshot = { ...this.snapshot, error: '暂时读不到今日进度' }; this.send(); }
      }
    })().finally(() => {
      clearTimeout(timeout); this.cancelRead = undefined;
      this.reading = null; clearTimeout(this.poll);
      if (!this.closed && this.ready && this.preferences.visible) this.poll = setTimeout(() => { void this.refresh(); }, generation !== this.generation ? 0 : 15_000);
    });
    return this.reading;
  }
  async sync(args: Row) {
    if (!this.supported || args.desktop !== true) return { supported: false, available: false };
    if (this.closed) return { supported: true, available: false, error: '桌面陪伴已关闭' };
    await this.loadPreferences();
    if (args.preferencesChanged === true || args.initial === true && this.revision === 0) this.updatePreferences(args);
    if (typeof args.reduced === 'boolean' && args.reduced !== this.preferences.reduced) this.updatePreferences({ ...this.preferences, reduced: args.reduced });
    const sessionId = typeof args.sessionId === 'string' ? args.sessionId.slice(0, 512) : '';
    if (sessionId !== this.sessionId) { this.sessionId = sessionId; this.generation++; this.cancelRead?.(); this.snapshot = { mood: this.snapshot.mood || 'idle' }; clearTimeout(this.poll); this.poll = undefined; }
    if (typeof args.mood === 'string' && moods.has(args.mood)) this.snapshot.mood = args.mood;
    if (args.restart === true && !this.ready) this.failed = '';
    // A persisted off switch should also avoid booting an invisible WPF
    // process. An already running pet still receives the hide preference.
    if (this.preferences.visible || this.child) await this.start();
    if (this.ready) {
      this.send(args.resetPosition === true ? { resetPosition: true } : {});
      if (this.preferences.visible && !this.poll && !this.reading) void this.refresh();
    }
    return { supported: true, available: this.ready, error: this.failed || this.preferenceError, preferences: this.preferences, revision: this.revision, details: this.details };
  }
  async close() {
    this.closed = true; this.generation++; this.cancelRead?.(); clearTimeout(this.poll);
    const child = this.child; this.child = null; this.ready = false;
    if (child && !child.stdin.destroyed) child.stdin.end('{"type":"quit"}\n');
    if (child) { const timer = setTimeout(() => { if (child.exitCode === null) child.kill(); }, 1500); timer.unref(); child.once('exit', () => clearTimeout(timer)); }
    await this.writes.catch(() => {});
  }
}
