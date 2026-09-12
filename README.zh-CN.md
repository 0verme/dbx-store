# DBX Store

这是 [DBX](https://github.com/t8y2/dbx) 的官方插件目录、发布者记录和审核元数据仓库。

[English](README.md) | 简体中文

DBX 从以下地址读取生成后的官方插件目录：

```text
https://raw.githubusercontent.com/t8y2/dbx-store/main/catalog/index.json
```

## 仓库结构

```text
dbx-store/
├── plugins/                 # 每个插件一份经过审核的元数据
├── publishers/              # 发布者身份和审核记录，不包含私钥
├── signing-keys.json        # DBX Store 仓库签名密钥记录
├── catalog/index.json       # DBX 使用的生成目录
├── revoked.json             # 已撤销的插件版本和签名密钥
├── schemas/                 # 目录 Schema
└── scripts/validate.mjs     # 确定性的目录生成与校验脚本
```

插件源码保存在作者自己的仓库中。CI 生成的 `.dbxp` 安装包应放在 GitHub Release、对象存储或 CDN 中，不能提交到本仓库。

## 提交位置

- 插件源码、测试和插件自身的 Release：插件作者自己的源码仓库。
- DBX Host、SDK、CLI、协议、Schema 和官方示例：[`t8y2/dbx`](https://github.com/t8y2/dbx)。
- 签名前审核：在本仓库创建 **Plugin submission Issue**。
- 最终 Marketplace 上架：向 [`t8y2/dbx-store:main`](https://github.com/t8y2/dbx-store/tree/main) 提交 catalog PR，不是向 `t8y2/dbx` 提交。

## 插件作者上架流程

### 1. 开发并发布候选包

在插件自己的源码仓库中开发、测试并创建不可变的版本 Tag。使用 DBX Plugin CLI 构建未签名候选包：

```bash
dbx-plugin package .
```

插件 Release 应包含：

- 每个支持平台的未签名 `.dbxp` 候选包；
- 每个候选包对应的 `.artifact.json`；
- 汇总后的 `release-candidates.json`；
- Release Notes 和对应的源码 Tag。

候选包可以放在插件仓库的 GitHub Release、CDN 或对象存储中，但不要把 `.dbxp` 二进制提交到 Git 历史。

### 2. 创建审核 Issue

在 [`dbx-store Issues`](https://github.com/t8y2/dbx-store/issues/new/choose) 中选择 **Plugin submission**，提供：

- 插件 ID、版本和发布者 ID；
- 源码仓库和不可变的源码 Tag 或 commit；
- `release-candidates.json` 的 HTTPS 地址；
- 插件功能、权限、数据访问和网络访问；
- Native Sidecar 的进程、端口、文件写入和外部命令行为；
- 许可证、隐私政策和支持地址。

审核通过前，不要自行填写官方 `signingKeyId`，也不要把插件源码提交到 `t8y2/dbx`。

### 3. 等待审核和官方签名

DBX Store 维护者会检查源码、`manifest.json`、权限、候选包的 SHA-256 和大小，以及 Native Sidecar 行为。审核通过后，维护者运行受保护的 **Sign approved plugin candidate** Workflow。

Workflow 会验证候选包仍是未签名包、Manifest ID 和版本正确、下载内容与已审核 SHA-256/大小一致，然后使用 DBX Store 仓库 Ed25519 密钥生成：

- 最终签名 `.dbxp`；
- 最终 `.artifact.json`；
- `.signing-receipt.json`。

作者不会接触官方仓库私钥。

### 4. 提交最终 catalog PR

获得最终签名 artifact metadata 后，Fork 本仓库并新增或更新：

```text
publishers/<publisher-id>.json    # 发布者首次提交时需要
plugins/<plugin-id>.json
catalog/index.json                # 由校验脚本生成
```

在仓库根目录运行：

```bash
node scripts/validate.mjs
```

然后向 `t8y2/dbx-store:main` 创建 Pull Request。每个 artifact 的 `url`、`sha256`、`size` 和 `signingKeyId` 必须来自最终签名 metadata。

最终上架 PR 不能包含：

- `.dbxp` 二进制或完整插件源码；
- 私钥、Token、凭据或其他 Secret；
- 未签名候选包 URL 作为最终下载地址；
- 作者自行设置的 `verified: true`。

## 维护者签名配置

官方仓库签名使用两个 GitHub Environment：

- `plugin-signing`：配置必需审核人 `t8y2`，并开启禁止提交者自审，供其他人发起工作流时使用；
- `plugin-signing-owner`：配置同一审核人，但关闭禁止提交者自审，仅在 `t8y2` 发起工作流时使用；
- 两个 Environment 都必须配置 `DBX_STORE_SIGNING_KEY`（Environment Secret）和 `DBX_STORE_SIGNING_KEY_ID`（Environment Variable）；
- `DBX_STORE_SIGNING_KEY_ID` 必须对应 `signing-keys.json` 中状态为 `active` 的 key；
- 公钥记录提交到 `signing-keys.json`，并随 DBX 发布到官方客户端的内置信任列表。

密钥轮换时必须使用新的 key ID，先让支持版本信任新公钥，再停止使用旧 key。泄露的密钥应记录到 `revoked.json`，不能复用旧 key ID。

维护者通过 Workflow 输入已审核的候选 URL、SHA-256、大小、插件 ID、版本、目标平台、输出文件名、Release Tag 和 SDK ref。Workflow 禁止覆盖已有 Release 资产；如果包内容发生变化，必须发布新的插件版本。

## 目录校验

```bash
node scripts/validate.mjs
```

校验器会检查插件 ID、语义化版本、发布者记录、签名 key、撤销记录、重复版本和目标、HTTPS artifact URL、SHA-256，以及生成的 `catalog/index.json`。它也会拒绝提交到仓库中的 `.dbxp` 文件。

## 信任模型

- 人工审核决定插件是否进入官方目录，以及是否可以显示 `verified`。
- catalog 中的 SHA-256 绑定审核时选择的最终 Release 资产。
- DBX Store 的 Ed25519 仓库签名保证安装包确实是审核并发布的字节。
- DBX 在安装前还会比对 Manifest 的插件 ID、版本、发布者、权限和签名 key。
- Native 插件后端使用当前操作系统用户权限运行；进入目录不代表获得操作系统级沙箱。

## 更新已有插件

每次更新都必须使用新的语义化版本，不能覆盖旧 Release 资产：

1. 在插件源码仓库发布新的源码 Tag 和未签名候选 Release；
2. 在本仓库创建新的 Plugin submission Issue，引用已有插件和新版本；
3. 等待审核并完成 DBX Store 仓库签名；
4. 提交更新 `plugins/<plugin-id>.json` 的 catalog PR。

插件代码问题应在插件源码仓库修复；只有目录元数据、审核状态、最终下载地址、哈希、大小和商店文案属于本仓库。

## 相关链接

- [DBX 插件开发文档目录](https://github.com/t8y2/dbx/tree/main/plugins)
- [提交插件的英文规范](CONTRIBUTING.md)
- [插件提交 Issue 模板](.github/ISSUE_TEMPLATE/plugin-submission.yml)
- [catalog PR 模板](.github/PULL_REQUEST_TEMPLATE/plugin-catalog.md)
