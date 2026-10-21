import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const moods = /* @__PURE__ */ new Set(["idle", "thinking", "writing", "waiting", "sleepy", "error"]);
class DesktopPet {
  child = null;
  starting = null;
  ready = false;
  closed = false;
  failed = "";
  preferenceError = "";
  sessionId = "";
  preferences = { role: "bigfish", visible: true, reduced: false };
  loaded = false;
  loading = null;
  revision = 0;
  sequence = 0;
  details = null;
  snapshot = {};
  poll;
  reading = null;
  cancelRead;
  generation = 0;
  writes = Promise.resolve();
  supported;
  launch;
  root;
  dispatch;
  constructor(root, dispatch, options = {}) {
    this.root = root;
    this.dispatch = dispatch;
    this.supported = options.supported ?? (process.platform === "win32" && Boolean(process.env.DSH_DESKTOP_NODE_EXECUTABLE));
    this.launch = options.launch || (() => spawn(join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), [
      "-NoLogo",
      "-NoProfile",
      "-STA",
      "-WindowStyle",
      "Hidden",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      fileURLToPath(new URL("../../../src/desktop/pet.ps1", import.meta.url)),
      "-StateDirectory",
      this.root,
      "-AssetsDirectory",
      fileURLToPath(new URL("../../../src/client/assets/pets/", import.meta.url)),
      "-ParentProcessId",
      String(process.pid)
    ], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }));
  }
  async loadPreferences() {
    if (this.loaded) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const value = JSON.parse(await readFile(join(this.root, "pet-desktop.json"), "utf8"));
        if (value?.role === "bigfish" || value?.role === "cuigengji") this.preferences.role = value.role;
        if (typeof value?.visible === "boolean") this.preferences.visible = value.visible;
        if (typeof value?.reduced === "boolean") this.preferences.reduced = value.reduced;
        this.revision = 1;
      } catch (error) {
        if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) this.preferenceError = `\u684C\u5BA0\u504F\u597D\u6682\u672A\u8BFB\u53D6\uFF1A${error.message}`;
      }
      this.loaded = true;
    })().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }
  updatePreferences(value) {
    const next = {
      role: value.role === "cuigengji" ? "cuigengji" : "bigfish",
      visible: value.visible !== false,
      reduced: value.reduced === true
    };
    if (JSON.stringify(next) === JSON.stringify(this.preferences)) return;
    this.preferences = next;
    this.revision++;
    if (!next.visible) {
      clearTimeout(this.poll);
      this.poll = void 0;
    }
    const saved = JSON.stringify(next);
    this.writes = this.writes.catch(() => {
    }).then(async () => {
      await mkdir(this.root, { recursive: true });
      const path = join(this.root, "pet-desktop.json"), temporary = path + ".tmp";
      await writeFile(temporary, saved, { mode: 384 });
      await rename(temporary, path);
      this.preferenceError = "";
    });
    void this.writes.catch((error) => {
      this.preferenceError = `\u684C\u5BA0\u504F\u597D\u6682\u672A\u4FDD\u5B58\uFF1A${error.message}`;
    });
  }
  send(extra = {}) {
    if (this.child && this.ready && !this.child.stdin.destroyed) {
      this.child.stdin.write(JSON.stringify({ type: "update", ...this.snapshot, ...this.preferences, sessionId: this.sessionId, ...extra }) + "\n");
    }
  }
  start() {
    if (this.closed || this.ready || this.failed) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = new Promise((resolve) => {
      let child;
      try {
        child = this.launch();
        this.child = child;
      } catch (error) {
        this.failed = `\u684C\u9762\u966A\u4F34\u65E0\u6CD5\u542F\u52A8\uFF1A${error.message}`;
        resolve();
        return;
      }
      let settled = false, errors = "";
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        resolve();
      };
      const fail = (message) => {
        if (this.child !== child && settled) return;
        this.ready = false;
        this.failed = message;
        clearTimeout(this.poll);
        if (this.child === child) this.child = null;
        done();
      };
      const deadline = setTimeout(() => {
        fail("\u684C\u9762\u966A\u4F34\u542F\u52A8\u8D85\u65F6\uFF0C\u5DF2\u5207\u56DE\u7A97\u53E3\u5185\u966A\u4F34\u3002");
        child.kill();
      }, 2e4);
      const lines = createInterface({ input: child.stdout });
      lines.on("line", (line) => {
        if (line.length > 8192 || this.child !== child || this.closed) return;
        try {
          const event = JSON.parse(line);
          if (event.type === "ready" && event.protocol === 1) {
            this.ready = true;
            this.failed = "";
            this.send();
            done();
          } else if (event.type === "preferences") {
            this.updatePreferences({ ...this.preferences, ...event });
            this.send();
          } else if (event.type === "details") this.details = { sequence: ++this.sequence, sessionId: this.sessionId };
        } catch {
        }
      });
      child.stderr.on("data", (chunk) => {
        errors = (errors + String(chunk)).slice(-1600);
      });
      child.stdin.on("error", () => {
      });
      child.once("error", (error) => fail(`\u684C\u9762\u966A\u4F34\u65E0\u6CD5\u542F\u52A8\uFF1A${error.message}`));
      child.once("exit", (code, signal) => {
        lines.close();
        if (this.child === child || !settled) fail(this.closed ? "" : `\u684C\u9762\u966A\u4F34\u5DF2\u9000\u51FA\uFF08${signal || (code ?? "\u672A\u77E5")}\uFF09${errors ? "\uFF1A" + errors.trim() : ""}`);
      });
    }).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }
  refresh() {
    if (this.reading) return this.reading;
    const generation = this.generation, sessionId = this.sessionId;
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("progress timeout")), 2e4);
      this.cancelRead = () => reject(new Error("cancelled"));
    });
    const read = async () => {
      const binding = sessionId ? await this.dispatch("binding.get", {}, { kind: "human", sessionId }) : null;
      if (generation !== this.generation || this.closed) return null;
      const novelId = binding?.activeNovelId || binding?.novelId;
      return this.dispatch("activity.today", novelId ? { novelId } : {}, { kind: "human", sessionId });
    };
    this.reading = (async () => {
      try {
        const result = await Promise.race([read(), deadline]);
        if (!result || generation !== this.generation || this.closed) return;
        const { date, novelId, title, stats } = result;
        this.snapshot = { ...this.snapshot, activity: {
          date,
          novelId,
          title: typeof title === "string" ? title.slice(0, 512) : null,
          stats: { proseAdded: stats.proseAdded, settingAdded: stats.settingAdded, planningChanges: stats.planningChanges }
        }, error: "" };
        this.send();
      } catch {
        if (generation === this.generation && !this.closed) {
          this.snapshot = { ...this.snapshot, error: "\u6682\u65F6\u8BFB\u4E0D\u5230\u4ECA\u65E5\u8FDB\u5EA6" };
          this.send();
        }
      }
    })().finally(() => {
      clearTimeout(timeout);
      this.cancelRead = void 0;
      this.reading = null;
      clearTimeout(this.poll);
      if (!this.closed && this.ready && this.preferences.visible) this.poll = setTimeout(() => {
        void this.refresh();
      }, generation !== this.generation ? 0 : 15e3);
    });
    return this.reading;
  }
  async sync(args) {
    if (!this.supported || args.desktop !== true) return { supported: false, available: false };
    if (this.closed) return { supported: true, available: false, error: "\u684C\u9762\u966A\u4F34\u5DF2\u5173\u95ED" };
    await this.loadPreferences();
    if (args.preferencesChanged === true || args.initial === true && this.revision === 0) this.updatePreferences(args);
    if (typeof args.reduced === "boolean" && args.reduced !== this.preferences.reduced) this.updatePreferences({ ...this.preferences, reduced: args.reduced });
    const sessionId = typeof args.sessionId === "string" ? args.sessionId.slice(0, 512) : "";
    if (sessionId !== this.sessionId) {
      this.sessionId = sessionId;
      this.generation++;
      this.cancelRead?.();
      this.snapshot = { mood: this.snapshot.mood || "idle" };
      clearTimeout(this.poll);
      this.poll = void 0;
    }
    if (typeof args.mood === "string" && moods.has(args.mood)) this.snapshot.mood = args.mood;
    if (args.restart === true && !this.ready) this.failed = "";
    if (this.preferences.visible || this.child) await this.start();
    if (this.ready) {
      this.send(args.resetPosition === true ? { resetPosition: true } : {});
      if (this.preferences.visible && !this.poll && !this.reading) void this.refresh();
    }
    return { supported: true, available: this.ready, error: this.failed || this.preferenceError, preferences: this.preferences, revision: this.revision, details: this.details };
  }
  async close() {
    this.closed = true;
    this.generation++;
    this.cancelRead?.();
    clearTimeout(this.poll);
    const child = this.child;
    this.child = null;
    this.ready = false;
    if (child && !child.stdin.destroyed) child.stdin.end('{"type":"quit"}\n');
    if (child) {
      const timer = setTimeout(() => {
        if (child.exitCode === null) child.kill();
      }, 1500);
      timer.unref();
      child.once("exit", () => clearTimeout(timer));
    }
    await this.writes.catch(() => {
    });
  }
}
export {
  DesktopPet
};
