# 鸿蒙 App 改造 — 阶段 1：抓取能力验证

## 这一步要做什么

验证唯一的关键风险：**ArkWeb（鸿蒙内置浏览器内核）发出的请求，能不能拿到干净正文**。

背景：本站接口 `apibi.cc` 对"非浏览器请求"会返回污染数据（无关书籍、色情内容），
项目在电脑上是靠 Puppeteer 开真 Chrome 解决的。鸿蒙没有 Node/Puppeteer，
必须换成 ArkWeb 的 `runJavaScript` 在真实页面上下文里 fetch。
**这一步通过，整套方案成立；不通过，就得改架构。**

## 操作步骤（约 10 分钟）

### 1. 安装 DevEco Studio

下载 Windows 版：https://developer.huawei.com/consumer/cn/deveco-studio/
（约 4GB，安装时保持默认选项，会自动装 SDK 和模拟器）

### 2. 新建工程

1. 打开 DevEco Studio → **Create Project**
2. 选 **Empty Ability** → Next
3. 填写：
   - Project name: `BookGrabTest`
   - Bundle name: `com.test.bookgrab`
   - Compatible SDK: **API 12 或更高**（鸿蒙 7.0 用最新版即可）
   - Model: **Stage**
4. Finish，等待首次同步完成（右下角进度条走完）

### 3. 替换代码

把本目录的 `Index.ets` **整个内容**覆盖到工程里的：

```
entry/src/main/ets/pages/Index.ets
```

### 4. 添加网络权限

打开 `entry/src/main/module.json5`，在 `module` 里加 `requestPermissions`：

```json5
"requestPermissions": [
  { "name": "ohos.permission.INTERNET" }
]
```

### 5. 连手机运行

1. 手机开启**开发者模式**：设置 → 关于手机 → 连续点「版本号」7 次
2. 设置 → 系统和更新 → 开发人员选项 → 打开 **USB 调试**
3. USB 连电脑，手机上点「允许调试」
4. DevEco 右上角设备列表选你的手机 → 点绿色三角运行
5. 首次会要求**华为账号登录 + 自动签名**，按提示操作（个人账号免费）

### 6. 看结果

App 打开后等 2~3 秒（"站点已加载"），点按钮，看结论：

| 显示 | 含义 | 下一步 |
|---|---|---|
| ✅ 通过：拿到干净正文 | 方案成立 | 告诉我，我开始写完整 App |
| ❌ 失败：返回了污染数据 | ArkWeb 被识别 | 我改方案（加请求头伪装 / 改远程后端） |
| ⚠️ 正文过短 / 执行出错 | 站点 JS 未加载 | 把下方原始返回发我 |

**请把 App 上显示的「结果」区域整段文字发给我**（可长按复制）。

## 判定原理

脚本调用的是站点自己的 `get_api('chapter', {...})`——它会用页面里的 CryptoJS
加密参数生成带 token 的 URL，然后 `fetch` 拿 JSON。检查三项：

1. `ok: true` — 脚本执行成功、接口返回 JSON
2. `len > 500` — 正文有实际内容
3. `dirty: false` — 不含污染特征词（素人/aaxs8/shw5 等）

三项都满足 = 手机能独立抓取，不需要电脑。
