# npm 发布与按包名安装

整体渠道分工与发布验收顺序见[渠道维护与发布流程](release-process.md)。本文负责 npm 首次发布、可信发布配置和按包名安装验收。

npm 包、GitHub 仓库和市场显示名统一为 **`dsh-cuigengji-plugin`**。目标精确版本、归档和默认标签均验收通过后，用户可在 DSH「插件 → 添加插件 → 包名或地址」中填写 `dsh-cuigengji-plugin`，固定版本填写 `dsh-cuigengji-plugin@0.4.3`。「安装源」选择默认、npm 官方源或大陆镜像，不填写 GitHub 地址。这条路线不需要 Git。旧包名安装的用户按[名称迁移指南](package-name-migration.md)更新。

首次发布需要维护者自己的 npm 账号。npm 发布与 `dshmarket` 收录互相独立：npm 包可用不代表市场已收录，市场收录状态仍以[收录申请](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7064)和公开目录为准。

2026-10-11 已完成 npm **0.4.3** 验收：精确版本已公开，`latest` 指向 0.4.3，归档 SHA-256 与 GitHub Release 相同，完整性检查通过。默认包名全新安装、0.4.2 同名升级和 0.4.1 旧名升级均在没有 Git、没有另装 Node.js 的 Windows 桌面运行时中通过；合成作品与原配置保留。[仅验收工作流](https://github.com/mistnest/dsh-cuigengji-plugin/actions/runs/38148012920)已成功，未重复上传。用户可按[桌面安装步骤](getting-started.md)直接填写包名。

首次上传后 npm 曾后台处理较长时间，早期验收超时；公开后补验收即可。另一次更新 0.4.2 标签的请求返回过 `E403: This trusted publisher cannot manage dist-tags`。本次 0.4.3 的默认标签已随公开处理到位，所以补验收未调用标签更新，不代表独立的 `Allow npm dist-tag` 权限已经验证。后续需要单独管理标签时仍按下文核对该权限。

## 首次发布

维护者优先使用 `npm run release -- trust` 和 `npm run release -- publish`。下面的首次手工步骤用于尚未上传的新版本；已被 npm 接受的上传不能因公开验收超时而重传。

首次 npm 发布使用已验收的 GitHub Release `.tgz`，保持两处安装包完全相同。不要将源码目录重新打成另一份相同版本的包，也不要上传小说、聊天、配置或迁移备份。

1. 在 [npm](https://www.npmjs.com/signup) 注册维护者账号，完成邮箱验证及 npm 要求的发布身份验证。公开包可以免费发布。邮箱登录验证码不等于发布用的双重验证；首次直接发布前，按 [npm 官方说明](https://docs.npmjs.com/configuring-two-factor-authentication/)在账号设置中启用 2FA，并由账号持有人使用 Windows Hello 或自己的安全密钥完成验证。未完成时保留已验收的 Release 入口，不宣称 npm 已可用。
2. 使用 `npm login --registry=https://registry.npmjs.org` 登录，再用 `npm whoami --registry=https://registry.npmjs.org` 核对发布身份。密码、验证码和登录 token 不写进仓库或聊天。
3. 切换到对应的公开版本源码，下载 GitHub Release 中的 `dsh-cuigengji-plugin-<版本>.tgz` 和 `SHA256SUMS`，用 SHA-256 核对 `.tgz`，再审计实际归档文件清单。首次发布目标为 `v0.4.3`；旧 `v0.4.1` 资产的包名不同，保留原样，不改名上传。

```powershell
gh release download v0.4.3 --repo mistnest/dsh-cuigengji-plugin --pattern dsh-cuigengji-plugin-0.4.3.tgz --pattern SHA256SUMS --dir "$env:TEMP\cuigengji-npm-0.4.3"
Get-FileHash -Algorithm SHA256 "$env:TEMP\cuigengji-npm-0.4.3\dsh-cuigengji-plugin-0.4.3.tgz"
npm pack "$env:TEMP\cuigengji-npm-0.4.3\dsh-cuigengji-plugin-0.4.3.tgz" --ignore-scripts --dry-run --json > "$env:TEMP\cuigengji-npm-0.4.3\pack-files.json"
node scripts/audit-release.mjs "$env:TEMP\cuigengji-npm-0.4.3\pack-files.json"
```

确认哈希与 `SHA256SUMS` 相同、文件审计通过，再发布已经核对过的归档：

```powershell
npm publish "$env:TEMP\cuigengji-npm-0.4.3\dsh-cuigengji-plugin-0.4.3.tgz" --access public --ignore-scripts --registry=https://registry.npmjs.org --tag latest
npm view dsh-cuigengji-plugin@0.4.3 version repository.url dist.integrity --registry=https://registry.npmjs.org
```

首次发布包含的 README 是对应 GitHub Release 的历史快照，安装说明以公开仓库当前文档为准。发布后下载 npm 的 `dist.tarball`，再次核对其 SHA-256 与 GitHub 资产相同。npm 同一版本不可替换；内容不符时停止发布，按新版本处理。

## 后续自动发布

维护者的固定入口为 `npm run release -- trust`：使用 npm 12.2.0 官方 CLI，先读取现有配置，只在缺少匹配权限时添加 `mistnest/dsh-cuigengji-plugin` 的 `publish-npm.yml` 可信发布；不删除其他连接。核对直接发布权限后启用仓库变量。该首次步骤仍需要使用真实安全密钥完成 npm 验证，不能由密码、邮箱验证码或恢复码代替。

首次包已经发布后，在 npm 的 `dsh-cuigengji-plugin` 包设置中添加 GitHub Actions trusted publisher：

- Organization or user：`mistnest`
- Repository：`dsh-cuigengji-plugin`
- Workflow filename：`publish-npm.yml`
- Environment name：留空（本工作流不声明 environment）
- Allowed actions：启用直接 `npm publish`。只允许 staging 不能完成本工作流的正式发布。
- Allow npm dist-tag：在包设置中为同一仓库和 `publish-npm.yml` 启用。上传与管理 `latest` / `next` 是独立权限；CLI 的 `trust` 命令目前不能代替这个网页设置。

配置位置和字段以 [npm 官方可信发布说明](https://docs.npmjs.com/trusted-publishers/) 为准。此连接只给指定仓库的指定工作流发布该包的权限，不需要把长期 npm token 放进 GitHub Secrets。

确认 npm 配置完成后，在公开仓库 Settings → Secrets and variables → Actions → Variables 新建仓库变量 `NPM_TRUSTED_PUBLISHING_ENABLED=true`，启用自动发布。未启用时工作流跳过，不将首次账号验证尚未完成误报成插件安装失败。

首次建立可信发布授权后，必须在两天内通过该授权真实发布一个新版本，完成 npm 对仓库身份的绑定；超时未验证的授权会失效。重跑已发布版本时，本工作流只核对原归档并跳过上传，不能代替首次可信发布验收。按 [npm 官方说明](https://docs.npmjs.com/trusted-publishers/#trusted-publisher-configuration-expiry)准备下一次补丁发布，确认 GitHub Actions 的上传步骤实际成功后，才将自动发布标为已验收。

后续维护 Agent 负责构建、检查、发布和渠道同步，账号持有人保管安全密钥与恢复码。维护流程、仓库和工作流名称可以写入交接文档；密码、一次性验证码、恢复码和访问 token 不作为项目交接资料。首次身份验证或账号授权变更需要持有人操作时，明确说明具体页面和步骤，不使用恢复码代替日常发布验证。

之后照常完成测试，提交编译产物，建立与 `package.json` 版本一致的 `v<版本>` 标签，并发布带 `.tgz` 和 `SHA256SUMS` 的 GitHub Release。`.github/workflows/publish-npm.yml` 会自动：

1. 检出版本标签，验证包名、版本与公开仓库身份，运行测试、类型检查及编译产物核对。
2. 下载 GitHub 已发布成品包，核对 SHA-256，并审计归档，保证 npm 与 GitHub 使用同一份包。
3. 使用 npm trusted publishing 发布。稳定版使用 `latest`，预发布版使用 `next`。
4. 等待 npm 的发布前扫描，最多 30 分钟，每 30 秒查一次精确版本。归档公开后核对包身份、SHA-256 和完整性，再确认或修正 `latest` / `next`。已有版本只有在归档完全一致时才跳过上传；任何不一致都会失败。

CLI 显示 `+ 包名@版本` 不足以证明可用。发布流程还要核对精确版本、`dist.integrity`、`latest` / `next` 指向和原生安装；公开包只有 `0.0.0-stage` 时视为未完成。若直接上传返回成功但精确版本不存在、`npm stage list` 也为空，保留状态为“公开版本待确认”，不要反复重传同版本或擅自消耗恢复码。

npm [官方说明](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/)明确：新包先扫描再允许安装，通常约 5 分钟，也可能超过 15 分钟或进入人工审核。超过本工作流的等待窗口不等于上传失败。查看 npm 的通知与待审核列表，再用仅验收模式恢复；它不会重新上传：

```powershell
gh workflow run publish-npm.yml --repo mistnest/dsh-cuigengji-plugin --ref main --field tag=v0.4.3 --field verify_only=true
npm run release -- verify
```

若归档已公开，但 `latest` 仍是占位版本，先核对归档，再完成标签权限或由维护者用真实身份验证修正标签。后续工作流会自动处理。可信发布的标签权限默认关闭，且要求 npm 11.21.0 或 12.2.0 起的 CLI，见[官方文档](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing)。不要重新发布同版本来改标签。

旧 Release 或工作流中断可以在 GitHub Actions 的「Publish npm package」中手动运行，填写已有的 Release 标签。没有 trusted publisher 或权限不符时停止处理，不改用不明来源的凭据。

## 按包名安装验收

首次发布后，在没有 Git 的隔离 Windows profile 中运行 DSH 原生安装及迁移验收：

```powershell
node scripts/check-release-install.mjs --desktop-exe "C:\你的DSH安装目录\DeepSeek Harness.exe" --npm-package dsh-cuigengji-plugin@0.4.3 --report "C:\验收目录\npm-install.json"
```

添加 `--old-package <公开旧版.tgz>` 可验证旧版升级到 npm 包，核对正文、回收站、规划、设定、预设、绑定及正文历史保留。脚本使用临时 profile 和合成库，不操作真实小说。

另外使用真实 DSH 界面，在「包名或地址」填写 `dsh-cuigengji-plugin` 完成安装，核对实际加载版本与维护状态。大陆镜像在首次发布后可能尚未同步；此时可在安装源选择 npm 官方源，或继续使用 GitHub Release `.tgz`。不通过更改供应链保护或构建白名单解决同步问题。
