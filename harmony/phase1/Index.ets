import { webview } from '@kit.ArkWeb';
import { BusinessError } from '@kit.BasicServicesKit';

// ===== 验证目标 =====
// 在 ArkWeb 的真实页面上下文里调用站点自带的 get_api()（内含 CryptoJS 加密 token），
// 再 fetch 章节接口，检查返回正文是否干净（不含 apibi 的污染特征）。
// 通过 → 说明"手机本地抓取"方案成立，可以做完整 App。
// 失败 → 需要换方案（例如带真实请求头，或改为远程后端）。

const SITE: string = 'https://www.bqg713.cc/';
const TEST_ID: number = 8803;    // 《邪神传说》
const TEST_CH: number = 1;

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();
  @State ready: boolean = false;
  @State busy: boolean = false;
  @State showSite: boolean = false;
  @State result: string = '';
  @State verdict: string = '';
  @State log: string = '正在加载站点首页，请稍候…';

  // 在页面上下文执行：生成带 token 的接口 URL → fetch → 返回摘要
  private buildScript(): string {
    return "(async () => {"
      + "try {"
      + "  if (typeof get_api !== 'function') return JSON.stringify({ ok:false, error:'get_api 未定义（站点脚本未加载）' });"
      + "  const u = get_api('chapter', { id: " + TEST_ID + ", chapterid: " + TEST_CH + " });"
      + "  const r = await fetch(u);"
      + "  const d = await r.json();"
      + "  const txt = d.txt || '';"
      + "  const dirty = /搜索素人视频|aaxs8|shw5|srsp|biquie|素人|22xsw/.test(txt);"
      + "  return JSON.stringify({ ok:true, title:d.chaptername||'', len:txt.length,"
      + "    head:txt.slice(0,80), dirty:dirty, api:u.slice(0,70) });"
      + "} catch (e) { return JSON.stringify({ ok:false, error:String((e && e.message) || e) }); }"
      + "})()";
  }

  private runTest(): void {
    this.busy = true;
    this.result = '';
    this.verdict = '';
    this.log = '正在抓取《邪神传说》第 1 章…';
    this.controller.runJavaScript(this.buildScript()).then((res: string) => {
      this.busy = false;
      this.result = res;
      try {
        const o: Record<string, Object> = JSON.parse(res) as Record<string, Object>;
        const ok: boolean = o.ok === true;
        const dirty: boolean = o.dirty === true;
        const len: number = Number(o.len || 0);
        if (ok && !dirty && len > 500) {
          this.verdict = '✅ 通过：拿到干净正文，本地抓取方案成立';
          this.log = '正文长度 ' + len + ' 字，无污染特征';
        } else if (ok && dirty) {
          this.verdict = '❌ 失败：返回了污染数据，ArkWeb 被识别为爬虫';
          this.log = '需要换方案（加请求头 / 改远程后端）';
        } else if (ok) {
          this.verdict = '⚠️ 异常：返回成功但正文过短';
          this.log = '正文长度仅 ' + len + ' 字';
        } else {
          this.verdict = '❌ 执行出错';
          this.log = String(o.error || '未知错误');
        }
      } catch (e) {
        this.verdict = '⚠️ 结果无法解析';
        this.log = '原始返回见下方';
      }
    }).catch((err: BusinessError) => {
      this.busy = false;
      this.verdict = '❌ runJavaScript 调用失败';
      this.log = '错误码 ' + err.code + '：' + err.message;
    });
  }

  build() {
    Column({ space: 12 }) {
      Text('鸿蒙抓取能力验证')
        .fontSize(20).fontWeight(FontWeight.Bold)
      Text(this.ready ? '站点已加载，可以开始测试' : '站点加载中…')
        .fontSize(13).fontColor('#888888')

      Button(this.busy ? '抓取中…' : '测试抓取《邪神传说》第 1 章')
        .width('100%')
        .enabled(this.ready && !this.busy)
        .onClick(() => this.runTest())

      if (this.verdict.length > 0) {
        Text(this.verdict)
          .fontSize(15).fontWeight(FontWeight.Medium)
          .fontColor(this.verdict.indexOf('✅') === 0 ? '#1a7f37' : '#c0392b')
          .width('100%')
      }
      if (this.log.length > 0) {
        Text(this.log).fontSize(12).fontColor('#666666').width('100%')
      }

      Scroll() {
        Text(this.result.length > 0 ? this.result : '(结果会显示在这里)')
          .fontSize(11)
          .fontFamily('monospace')
          .copyOption(CopyOptions.LocalDevice)
          .width('100%')
      }
      .layoutWeight(1)
      .width('100%')
      .padding(10)
      .backgroundColor('#f5f5f5')
      .borderRadius(8)
      .align(Alignment.TopStart)

      Button(this.showSite ? '隐藏站点页面' : '显示站点页面（排错用）')
        .width('100%').height(32).fontSize(12)
        .backgroundColor('#e8e8e8').fontColor('#333333')
        .onClick(() => { this.showSite = !this.showSite; })

      // 承载站点 JS 的隐藏页面（opacity 极低但保持渲染，1x1 可能不执行脚本）
      Web({ src: SITE, controller: this.controller })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .mixedMode(MixedMode.All)
        .width(this.showSite ? '100%' : 1)
        .height(this.showSite ? 360 : 1)
        .opacity(this.showSite ? 1 : 0.01)
        .onPageEnd(() => {
          this.ready = true;
          if (this.log.indexOf('正在加载') === 0) {
            this.log = '站点加载完成，点击上方按钮开始测试';
          }
        })
        .onErrorReceive(() => {
          this.log = '站点加载出错，请检查手机网络';
        })
    }
    .padding(16)
    .width('100%')
    .height('100%')
  }
}
