const providerTemplates = {
  deepseek: {
    name: "DeepSeek",
    currency: "CNY",
    keyRef: "DEEPSEEK_API_KEY",
    builtin: true,
    balance: { url: "https://api.deepseek.com/user/balance", auth: "Bearer {key}", json: { remaining: "balance_infos[0].total_balance" } }
  },
  openrouter: {
    name: "OpenRouter",
    currency: "USD",
    keyRef: "OPENROUTER_API_KEY",
    balance: { url: "https://openrouter.ai/api/v1/credits", auth: "Bearer {key}", json: { total: "data.total_credits", used: "data.total_usage" } }
  },
  siliconflow_cn: {
    name: "\u7845\u57FA\u6D41\u52A8\uFF08CN\uFF09",
    currency: "CNY",
    keyRef: "SILICONFLOW_API_KEY",
    noBalanceApi: true,
    // ⚠️ 官方已下线余额接口（不是"暂时故障"）——2026-08-11 更新公告《【接口服务调整】/user/info 接口将停止服务》：
    //   「/user/info 已无法适配平台用户账户体系，该 API 将于 2026-08-14 正式停止服务，届时接口将不再可用」，
    //   并称「后续将适时提供账户层面的替代 API，新接口上线后将在本页面另行通知」。
    //   截至 2026-09-14，公告页最新条目（2026.09.09）**仍未见替代 API**；CN 文档「平台系列」也只剩「获取用户模型列表」。
    //   v724 路由实测：/v1 下未知路径 404、而 /v1/user/info 仍返 401（鉴权层）→ 路由没被摘掉，但按公告已不可用。
    //   → 日后官方恢复或上线替代接口：把 url 与 json 字段路径填回来即可（模板只是默认值，用户可覆盖）。
    apiNote: "\u5B98\u65B9\u5DF2\u4E0B\u7EBF /user/info \u4F59\u989D\u63A5\u53E3\uFF082026-08-14 \u8D77\u505C\u6B62\u670D\u52A1\uFF1B\u516C\u544A\u79F0\u540E\u7EED\u4F1A\u63D0\u4F9B\u66FF\u4EE3 API\uFF0C\u6682\u672A\u4E0A\u7EBF\uFF09\u2192 \u4F59\u989D\u663E\u793A\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97\uFF1B\u300C\u6D4B\u8BD5\u8FDE\u901A\u6027\u300D\u7528 /v1/models \u9A8C\u8BC1 key",
    matchIds: ["siliconflow", "Qwen", "deepseek-ai"],
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } },
    probeUrl: "https://api.siliconflow.cn/v1/models"
  },
  siliconflow_en: {
    name: "\u7845\u57FA\u6D41\u52A8\uFF08EN\uFF09",
    currency: "USD",
    keyRef: "SILICONFLOW_API_KEY",
    noBalanceApi: true,
    // 同国内站：余额接口已停止服务。注意国际站文档 docs.siliconflow.com 至今仍挂着 Retrieve user info 页
    //（文档未同步），不能据此认为接口可用 —— 以国内官方公告为准。
    apiNote: "\u540C\u56FD\u5185\u7AD9\uFF1A/user/info \u4F59\u989D\u63A5\u53E3\u5DF2\u505C\u6B62\u670D\u52A1\uFF08\u56FD\u9645\u7AD9\u6587\u6863\u5C1A\u672A\u540C\u6B65\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["siliconflow", "Qwen", "deepseek-ai"],
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } },
    probeUrl: "https://api.siliconflow.com/v1/models"
  },
  moonshot: {
    // 大陆站：api.moonshot.cn，余额为人民币（充值 + 代金券合计）。v724 实测：200 且字段命中 ✓
    name: "Kimi / Moonshot\uFF08CN\uFF09",
    currency: "CNY",
    keyRef: "MOONSHOT_API_KEY",
    matchIds: ["moonshot", "kimi"],
    balance: { url: "https://api.moonshot.cn/v1/users/me/balance", auth: "Bearer {key}", json: { remaining: "data.available_balance" } },
    probeUrl: "https://api.moonshot.cn/v1/models"
  },
  moonshot_intl: {
    // 国际站是独立账号体系（key 不通用），余额按美元计
    name: "Kimi / Moonshot\uFF08\u56FD\u9645\uFF09",
    currency: "USD",
    keyRef: "MOONSHOT_INTL_API_KEY",
    balance: { url: "https://api.moonshot.ai/v1/users/me/balance", auth: "Bearer {key}", json: { remaining: "data.available_balance" } },
    probeUrl: "https://api.moonshot.ai/v1/models"
  },
  stepfun: {
    name: "\u9636\u8DC3\u661F\u8FB0 StepFun",
    currency: "CNY",
    keyRef: "STEPFUN_API_KEY",
    matchIds: ["stepfun", "step-"],
    balance: { url: "https://api.stepfun.com/v1/accounts", auth: "Bearer {key}", json: { remaining: "balance" } }
  },
  novita: {
    name: "Novita AI",
    currency: "USD",
    keyRef: "NOVITA_API_KEY",
    matchIds: ["novita"],
    balance: { url: "https://api.novita.ai/v3/user/balance", auth: "Bearer {key}", json: { remaining: "availableBalance", scale: 1e-4 } }
  },
  volcengine_ark: {
    name: "\u706B\u5C71\u65B9\u821F Ark",
    currency: "CNY",
    keyRef: "ARK_API_KEY",
    noBalanceApi: true,
    // 方舟没有「用 API key 查余额」的接口（余额/用量属于火山引擎 AK/SK 签名的 OpenAPI）。
    // v724 实测：/api/v3/models → 200（探活可用）；/api/v3/balance → 404（无余额接口，确认）。
    apiNote: "\u4F59\u989D/\u7528\u91CF\u9700\u706B\u5C71\u5F15\u64CE AK/SK \u7B7E\u540D\u7684 OpenAPI\uFF08\u6216\u63A7\u5236\u53F0\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97\uFF1B\u63A2\u6D3B\u7528 /api/v3/models\uFF08\u5B9E\u6D4B\u53EF\u7528\uFF09",
    matchIds: ["doubao", "ep-"],
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } },
    probeUrl: "https://ark.cn-beijing.volces.com/api/v3/models"
  },
  // —— 订阅额度（Coding Plan）模板：kind='quota'，语义是"窗口用量% + 重置时间"，不是钱 ——
  // 注意：这些接口只对「订阅套餐」账号有效。买 Token 包（资源包）的账号查不到额度
  // （智谱会返回「当前用户不存在coding plan」），那种情况用模型菜单里的
  // 「额度（订阅/资源包）」按会话 token 自动统计。
  zhipu_glm_coding: {
    name: "\u667A\u8C31 GLM Coding Plan\uFF08\u8BA2\u9605\uFF09",
    currency: "CNY",
    keyRef: "ZHIPU_API_KEY",
    kind: "quota",
    quota: {
      url: "https://open.bigmodel.cn/api/monitor/usage/quota/limit",
      auth: "{key}",
      // 智谱此接口不带 Bearer
      // v789（issue #180/#181 修）：`data.limits[]` 是扁平条目数组，`TOKENS_LIMIT` 是条目的 `type` **值**，
      //   且 5h 窗口不保证排在 [0]（pro 账号 [0] 是 TIME_LIMIT、max 账号 [0] 才是 TOKENS_LIMIT）
      //   ⇒ 一律按 type(+unit) 选条目：unit=3 = 5 小时窗口、unit=6 = 周窗口；
      //   新注册/credit 制账号的 type 是 CREDIT_LIMIT ⇒ 一并兼容。
      json: {
        level: "data.level",
        windows: [
          { key: "rolling", label: "5h", pick: { list: "data.limits", types: ["TOKENS_LIMIT", "CREDIT_LIMIT"], unit: 3 }, percent: "percentage", resetAt: "nextResetTime" },
          { key: "weekly", label: "\u5468", pick: { list: "data.limits", types: ["TOKENS_LIMIT", "CREDIT_LIMIT"], unit: 6 }, percent: "percentage", resetAt: "nextResetTime" }
        ]
      }
    },
    probeUrl: "https://open.bigmodel.cn/api/monitor/usage/quota/limit"
  },
  kimi_coding: {
    name: "Kimi Coding\uFF08\u8BA2\u9605\uFF09",
    currency: "CNY",
    keyRef: "KIMI_CODING_KEY",
    kind: "quota",
    quota: {
      url: "https://api.kimi.com/coding/v1/usages",
      auth: "Bearer {key}",
      json: { remain: "usage.remaining", total: "usage.limit", resetAt: "usage.resetTime" }
    },
    probeUrl: "https://api.kimi.com/coding/v1/usages"
  },
  minimax_coding: {
    name: "MiniMax Coding\uFF08\u8BA2\u9605\uFF09",
    currency: "CNY",
    keyRef: "MINIMAX_API_KEY",
    kind: "quota",
    quota: {
      url: "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains",
      auth: "Bearer {key}",
      json: {
        remainPct: "model_remains[0].current_interval_remaining_percent",
        weeklyRemainPct: "model_remains[0].current_weekly_remaining_percent",
        resetAtMs: "model_remains[0].end_time"
      }
    },
    probeUrl: "https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains"
  },
  // OpenCode Go（订阅）：一次返回 rolling / weekly / monthly 三个窗口，值为「已用% + 重置时间」
  // （usage.rolling|weekly|monthly.{percent,resetsAt}）。走多窗口路径 json.windows，见 fetchModelQuota。
  // 鉴权只需 Authorization: Bearer <key>（2026-09 实测：x-api-key 单独使用返回 401，无需额外请求头）。
  opencode_go: {
    name: "OpenCode Go\uFF08\u8BA2\u9605\uFF09",
    currency: "USD",
    keyRef: "OPENCODE_GO_API_KEY",
    kind: "quota",
    quota: {
      url: "https://opencode.ai/zen/go/v1/usage",
      auth: "Bearer {key}",
      json: {
        windows: [
          { key: "rolling", label: "5h", percent: "usage.rolling.percent", resetAt: "usage.rolling.resetsAt" },
          { key: "weekly", label: "\u5468", percent: "usage.weekly.percent", resetAt: "usage.weekly.resetsAt" },
          { key: "monthly", label: "\u6708", percent: "usage.monthly.percent", resetAt: "usage.monthly.resetsAt" }
        ]
      }
    },
    probeUrl: "https://opencode.ai/zen/go/v1/usage"
  },
  openai_compat: {
    name: "OpenAI \u517C\u5BB9\u4E2D\u8F6C\u7AD9",
    currency: "USD",
    keyRef: "CUSTOM_API_KEY",
    needsBaseUrl: true,
    // OneAPI / New API 一类网关的经典账单接口：额度(美元) + 已用(美分)
    balance: {
      url: "{base}/v1/dashboard/billing/subscription",
      auth: "Bearer {key}",
      json: { total: "hard_limit_usd" },
      usage: { url: "{base}/v1/dashboard/billing/usage", auth: "Bearer {key}", json: { used: "total_usage", scale: 0.01 } }
    }
  },
  custom: {
    name: "\u81EA\u5B9A\u4E49 HTTP",
    currency: "CNY",
    keyRef: "CUSTOM_API_KEY",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  // —— Codex 模式（第一期：本地会话统计）——
  // 不查余额、不联网、不用凭据：直接读 ~/.codex/sessions 的 rollout-*.jsonl 统计 token。
  // 好处：能覆盖「不在 DSH 里跑」的 Codex 使用；坏处：只有 token，没有金额（费用另由余额/额度口径处理）。
  codex: {
    name: "Codex\uFF08\u672C\u5730\u4F1A\u8BDD\uFF09",
    currency: "CNY",
    keyRef: "",
    kind: "codex",
    balance: { url: "", auth: "", json: { remaining: "" } }
  },
  // ================= v724：补齐「官方没有用 API key 查余额的接口」的常用厂商 =================
  // 作用：① 选完自动填好 凭据名 / 币种 / 事件匹配(matchIds) / 探活地址 ②「测试连通性」可验证 key
  // ③ 余额显示「—」，今日已用按本机会话事件估算（noBalanceApi + apiNote 会显示在面板提示里）。
  // 说明：probeUrl 一律用各家的 OpenAI 兼容 /v1/models（官方文档形态，能否通过取决于 key 权限）。
  openai: {
    name: "OpenAI",
    currency: "USD",
    keyRef: "OPENAI_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u5DF2\u4E0B\u7EBF billing \u4F59\u989D\u63A5\u53E3\uFF0C\u6CA1\u6709\u300C\u7528 API key \u67E5\u4F59\u989D\u300D\u7684\u516C\u5F00\u63A5\u53E3\uFF08\u53EA\u80FD\u770B\u63A7\u5236\u53F0\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["gpt", "o1-", "o3-", "o4-", "chatgpt"],
    probeUrl: "https://api.openai.com/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  anthropic: {
    name: "Anthropic Claude",
    currency: "USD",
    keyRef: "ANTHROPIC_API_KEY",
    noBalanceApi: true,
    // v791：请求头支持「分号分隔列表」后，探活这条路终于能走了 —— Anthropic 要求 x-api-key + anthropic-version 两个头。
    //   官方**没有余额接口**（余额/用量只能去控制台或 Admin API），所以这里只提供探活与模型列表。
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3\uFF08\u4F59\u989D/\u7528\u91CF\u89C1\u63A7\u5236\u53F0\uFF0C\u6216\u6309\u4F1A\u8BDD token \u4F30\u7B97\uFF09\u3002\u63A2\u6D3B\u8D70 /v1/models\uFF1A\u9700\u8981 x-api-key + anthropic-version \u4E24\u4E2A\u8BF7\u6C42\u5934\uFF08v791 \u8D77\u652F\u6301\uFF0C\u6A21\u677F\u5DF2\u9884\u7F6E\uFF09",
    matchIds: ["claude"],
    balance: { url: "", auth: "x-api-key:{key};anthropic-version:2023-06-01", json: { remaining: "" } },
    probeUrl: "https://api.anthropic.com/v1/models"
  },
  gemini: {
    name: "Google Gemini",
    currency: "USD",
    keyRef: "GEMINI_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3\uFF08\u914D\u989D\u53EA\u5728 AI Studio / Cloud \u63A7\u5236\u53F0\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97\uFF1B\u63A2\u6D3B\u7528 ?key= \u5F62\u5F0F",
    matchIds: ["gemini"],
    probeUrl: "https://generativelanguage.googleapis.com/v1beta/models?key={key}",
    balance: { url: "", auth: "", json: { remaining: "" } }
  },
  xai: {
    name: "xAI Grok",
    currency: "USD",
    keyRef: "XAI_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u516C\u5F00\u7684\u4F59\u989D\u67E5\u8BE2\u63A5\u53E3\uFF08\u989D\u5EA6\u5728 console.x.ai\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["grok"],
    probeUrl: "https://api.x.ai/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  groq: {
    name: "Groq",
    currency: "USD",
    keyRef: "GROQ_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3\uFF08\u514D\u8D39\u989D\u5EA6/\u901F\u7387\u5728\u63A7\u5236\u53F0\u770B\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["llama", "mixtral", "qwen", "deepseek", "gemma", "whisper"],
    probeUrl: "https://api.groq.com/openai/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  mistral: {
    name: "Mistral AI",
    currency: "USD",
    keyRef: "MISTRAL_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["mistral", "codestral", "magistral", "pixtral", "ministral"],
    probeUrl: "https://api.mistral.ai/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  together: {
    name: "Together AI",
    currency: "USD",
    keyRef: "TOGETHER_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["meta-llama", "Qwen", "deepseek", "mistralai", "nvidia"],
    probeUrl: "https://api.together.xyz/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  fireworks: {
    name: "Fireworks AI",
    currency: "USD",
    keyRef: "FIREWORKS_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["accounts/fireworks", "llama-v3", "qwen"],
    probeUrl: "https://api.fireworks.ai/inference/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  deepinfra: {
    name: "DeepInfra",
    currency: "USD",
    keyRef: "DEEPINFRA_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["meta-llama", "Qwen", "deepseek"],
    probeUrl: "https://api.deepinfra.com/v1/openai/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  cerebras: {
    name: "Cerebras",
    currency: "USD",
    keyRef: "CEREBRAS_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["llama", "qwen"],
    probeUrl: "https://api.cerebras.ai/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  dashscope: {
    name: "\u963F\u91CC\u4E91\u767E\u70BC\uFF08\u901A\u4E49\u5343\u95EE\uFF09",
    currency: "CNY",
    keyRef: "DASHSCOPE_API_KEY",
    noBalanceApi: true,
    apiNote: "\u4E91\u5382\u5546\uFF1A\u4F59\u989D/\u8D26\u5355\u8981\u8D70\u963F\u91CC\u4E91 AK/SK \u7684 OpenAPI\uFF08\u6216\u63A7\u5236\u53F0\uFF09\uFF0CAPI key \u67E5\u4E0D\u5230 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["qwen", "qwq", "qvq"],
    probeUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  qianfan: {
    name: "\u767E\u5EA6\u5343\u5E06\uFF08\u6587\u5FC3\uFF09",
    currency: "CNY",
    keyRef: "QIANFAN_API_KEY",
    noBalanceApi: true,
    apiNote: "\u4E91\u5382\u5546\uFF1A\u4F59\u989D/\u8D26\u5355\u8981\u8D70\u767E\u5EA6\u4E91 AK/SK\uFF08\u6216\u63A7\u5236\u53F0\uFF09\uFF0CAPI key \u67E5\u4E0D\u5230 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["ernie"],
    probeUrl: "https://qianfan.baidubce.com/v2/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  hunyuan: {
    name: "\u817E\u8BAF\u6DF7\u5143",
    currency: "CNY",
    keyRef: "HUNYUAN_API_KEY",
    noBalanceApi: true,
    apiNote: "\u4E91\u5382\u5546\uFF1A\u4F59\u989D/\u8D26\u5355\u8981\u8D70\u817E\u8BAF\u4E91 SecretId/Key\uFF08\u6216\u63A7\u5236\u53F0\uFF09\uFF0CAPI key \u67E5\u4E0D\u5230 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["hunyuan"],
    probeUrl: "https://api.hunyuan.cloud.tencent.com/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  spark: {
    name: "\u8BAF\u98DE\u661F\u706B",
    currency: "CNY",
    keyRef: "SPARK_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3\uFF08\u989D\u5EA6\u5728\u63A7\u5236\u53F0\uFF09\u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["spark", "generalv", "4.0ultra"],
    probeUrl: "https://spark-api-open.xf-yun.com/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  modelscope: {
    name: "\u9B54\u642D ModelScope",
    currency: "CNY",
    keyRef: "MODELSCOPE_API_KEY",
    noBalanceApi: true,
    apiNote: "\u5B98\u65B9\u65E0\u4F59\u989D\u63A5\u53E3 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF0C\u4ECA\u65E5\u5DF2\u7528\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u4F30\u7B97",
    matchIds: ["Qwen", "deepseek", "MiniMax", "glm"],
    probeUrl: "https://api-inference.modelscope.cn/v1/models",
    balance: { url: "", auth: "Bearer {key}", json: { remaining: "" } }
  },
  ollama: {
    name: "\u672C\u5730\u6A21\u578B\uFF08Ollama / LM Studio\uFF09",
    currency: "CNY",
    keyRef: "",
    noBalanceApi: true,
    needsBaseUrl: true,
    apiNote: "\u672C\u5730\u63A8\u7406\u6CA1\u6709\u4F59\u989D\u6982\u5FF5 \u2192 \u4F59\u989D\u300C\u2014\u300D\uFF1B\u586B\u597D Base URL\uFF08\u5982 http://127.0.0.1:11434/v1\uFF09\u540E\u6309\u4F1A\u8BDD\u4E8B\u4EF6\u7EDF\u8BA1 token",
    matchIds: ["llama", "qwen", "gemma", "deepseek", "mistral", "phi"],
    probeUrl: "{base}/v1/models",
    balance: { url: "", auth: "", json: { remaining: "" } }
  },
  zhipu_glm_coding_intl: {
    name: "\u667A\u8C31 GLM Coding Plan\uFF08\u56FD\u9645 z.ai\uFF09",
    currency: "USD",
    keyRef: "ZHIPU_INTL_API_KEY",
    kind: "quota",
    quota: {
      url: "https://api.z.ai/api/monitor/usage/quota/limit",
      auth: "{key}",
      // 与国内站一样不带 Bearer
      // v789：与国内站同一套 `data.limits[]` 结构（见 zhipu_glm_coding 的注释），一并按 type+unit 选条目
      json: {
        level: "data.level",
        windows: [
          { key: "rolling", label: "5h", pick: { list: "data.limits", types: ["TOKENS_LIMIT", "CREDIT_LIMIT"], unit: 3 }, percent: "percentage", resetAt: "nextResetTime" },
          { key: "weekly", label: "\u5468", pick: { list: "data.limits", types: ["TOKENS_LIMIT", "CREDIT_LIMIT"], unit: 6 }, percent: "percentage", resetAt: "nextResetTime" }
        ]
      }
    },
    probeUrl: "https://api.z.ai/api/monitor/usage/quota/limit"
  },
  minimax_coding_intl: {
    name: "MiniMax Coding\uFF08\u56FD\u9645\uFF09",
    currency: "USD",
    keyRef: "MINIMAX_INTL_API_KEY",
    kind: "quota",
    quota: {
      url: "https://api.minimax.io/v1/api/openplatform/coding_plan/remains",
      auth: "Bearer {key}",
      json: {
        remainPct: "model_remains[0].current_interval_remaining_percent",
        weeklyRemainPct: "model_remains[0].current_weekly_remaining_percent",
        resetAtMs: "model_remains[0].end_time"
      }
    },
    probeUrl: "https://api.minimax.io/v1/api/openplatform/coding_plan/remains"
  }
};
export {
  providerTemplates
};
