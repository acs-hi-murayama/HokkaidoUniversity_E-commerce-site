#!/usr/bin/env node
/* ============================================================
   build-production / transform.mjs
   ------------------------------------------------------------
   ローカル再現環境を「本番（らくうるカート）へ完全移行できる状態」に
   組み立てて production-build/ に出力する。

   方針：ストアフロントは original/（本番テンプレ原本）を忠実に模倣した
   Twigテンプレート構成にする。
     - Common_Part.html（共通枠・差し込み口）＋各ページ（MAIN_CONTENTS断片）
     - 商品描画は {% for item in itemList %} 等のSSR、トップは {{ dsnTop* }}
   取引ページ（cart.raku-uru.jp）はローカル再現を本番参照へ変換（参考）。

   ★ 元ファイル（ローカル & original）は読み取りのみ。書き込みは production-build/ だけ。
   実行: node .claude/skills/build-production/transform.mjs
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();                 // リポジトリ直下で実行される想定
const OUT = join(ROOT, "production-build");
const SHOP_URL = "https://hokudai-goods-seikyou.net";   // ストアフロント（WYSIWYG内は絶対URL直書き）
const SHP_HASH = "47409ca9deadd2be6543f3c2fc49d40f";    // 店舗ハッシュ

/* お知らせ/LP（WYSIWYGコンテンツ）内のローカルリンクを本番の絶対URLへ。
 * ※フリーページ/LP本文はTwigテンプレートではなく管理画面のWYSIWYGなので、
 *   {{ 変数 }} ではなく本番実例（fr-hokudai×bell.html 等）と同じ絶対URLを使う。 */
function wysiwygLinks(h) {
  h = h.replace(/href="(?:\.\.\/)*\.?\/?product-details\?id=([^"]+)"/g, `href="${SHOP_URL}/item-detail/$1"`);
  h = h.replace(/href="(?:\.\.\/)*\.?\/?product-list\?([^"]*)"/g, `href="${SHOP_URL}/item-list?$1"`);
  h = h.replace(/href="(?:\.\.\/)*\.?\/?product-list\.html"/g, `href="${SHOP_URL}/item-list"`);
  h = h.replace(/href="(?:\.\.\/)*\.?\/?search(?:\.html)?"/g, `href="${SHOP_URL}/search"`);
  h = h.replace(/href="(?:\.\.\/)*\.?\/?members-only-login\.html"/g, `href="${SHOP_URL}/member/regist/input/${SHP_HASH}"`);
  h = h.replace(/href="(?:\.\.\/)*\.?\/?common-id-login\.html"/g, `href="${SHOP_URL}/mypage/login/${SHP_HASH}"`);
  h = h.replace(/href="(?:\.\.\/)*index\.html"/g, `href="${SHOP_URL}/"`);
  return h;
}

/* ---------- 出力フォルダを作り直す（既存ローカル/originalには触れない） ---------- */
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
function emit(rel, content) {
  const dst = join(OUT, rel);
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, content, "utf8");
}

/* ============================================================
   1. ストアフロント = original/HTML を忠実複製（本番Twigテンプレート）
      Common_Part.html + Toppage/Product_List/Product_Details/Product_Search/
      404_Not_Found/Landing_Page/Common_ID_Login/Members-Only_Login
      → らくうるカートのテーマ編集（HTMLテンプレート）へ貼る対象。
   ============================================================ */
cpSync(join(ROOT, "original/HTML"), join(OUT, "HTML"), { recursive: true });

/* 2. テーマCSS = original/css を複製（本番 {{ cssAddr }} の実体） */
cpSync(join(ROOT, "original/css"), join(OUT, "css"), { recursive: true });

/* ============================================================
   3. 取引ページ（cart.raku-uru.jp）：ローカル再現 → 本番参照へ変換
      ※ ASP画面のため店舗はHTML構造を編集不可。本番の見た目確認用の参考。
   ============================================================ */
const CART_PAGES = [
  "cart/cart/index.html",
  "cart/member/regist/input/index.html",
  "cart/member/regist/confirm/index.html",
  "cart/member/regist/complete/index.html",
  "cart/mypage/login/index.html",
  "cart/mypage/index.html",
];

function transformCart(rel, html) {
  let h = html;
  h = h.replace(/<link\s+href="\/cart\/assets\/cart-common\.css"[^>]*>/g, '<link href="/resources/css/cart-common.css" rel="stylesheet">');
  h = h.replace(/<link\s+href="\/cart\/assets\/theme\.css"[^>]*>/g, '<link href="/getCss/{{ shpHash }}" rel="stylesheet">');
  h = h.replace(/<script\s+src="https:\/\/code\.jquery\.com\/jquery-1\.12\.4\.min\.js"[^>]*><\/script>/g,
    ['<script src="/resources/js/jquery-1.12.4.min.js"></script>',
     '<script src="/resources/js/jquery-ui-1.11.4.min.js"></script>',
     '<script src="/resources/js/jquery.flicksimple.js"></script>',
     '<script src="/resources/js/jquery.blockUI.js"></script>',
     '<script src="/resources/js/cart-script.js"></script>'].join("\n\t"));
  // ローカル挙動JS（cart-app.js）＋インライン実行ブロックは本番サーバー処理のため除去
  h = h.replace(/<script\s+src="\/cart\/assets\/cart-app\.js"><\/script>/g,
    "<!-- 本番: cart-app.js は不要（会員/カート/注文はサーバー処理） -->");
  h = h.replace(/[ \t]*<script>\s*(?:(?!<\/script>)[\s\S])*?TX\.(?:(?!<\/script>)[\s\S])*?<\/script>\s*/g,
    "\n<!-- 本番: 取引挙動のインラインJS(TX.*)は削除（サーバー処理） -->\n");
  // ロゴ/内部リンク → 本番参照
  h = h.replace(/(<a\s+href=")\/("><p class="logo-text")/g, '$1{{ shpUrl }}$2');
  h = h.replace(/https:\/\/hokudai-goods-seikyou\.net/g, '{{ shpUrl }}');
  h = h.replace(/(href=")\/cart\/member\/regist\/input\/?(")/g, '$1/member/regist/input/{{ shpHash }}$2');
  h = h.replace(/(href=")\/cart\/mypage\/login\/?(")/g, '$1/mypage/login/{{ shpHash }}$2');
  h = h.replace(/(href=")\/cart\/mypage\/?(")/g, '$1/mypage/{{ shpHash }}$2');
  h = h.replace(/(href=")\/cart\/cart\/?(")/g, '$1/cart/{{ shpHash }}$2');
  // フォームに _csrf hidden を復元
  h = h.replace(/(<form\b[^>]*id="[^"]*Form"[^>]*>)/g, '$1<input type="hidden" name="_csrf" value="{{ _csrf }}"/>');
  return h;
}
for (const rel of CART_PAGES) {
  try { emit(rel, transformCart(rel, read(rel))); } catch (e) { /* skip */ }
}

/* ============================================================
   4. デザイン設定コンテンツ（本番: 管理画面「デザイン設定」dsnTop*）
      ローカルの差し込みHTMLを、管理画面に貼る用に相対パスを補正して出力。
   ============================================================ */
const DESIGN = {
  "main-visual.html":  "dsnTopHtmlTag（キービジュアル）",
  "top-message1.html": "dsnTopDesc1Shop（ショップ説明1・LPスライダー）",
  "top-message2.html": "dsnTopDesc2Shop（ショップ説明2・案内）",
};
for (const f of Object.keys(DESIGN)) {
  let h = read("data/" + f);
  h = h.replace(/\.\/lp\//g, "/lp/")
       .replace(/\.\/product-list\?/g, "/item-list?")
       .replace(/href="\.\/index\.html"/g, 'href="/"')
       .replace(/href="\.\/"/g, 'href="/"');
  emit("design-settings/" + f, h);
}

/* 5. 商品データ（本番: 管理画面へCSVインポート。SSRの itemList 等の元データ） */
emit("data/products.json", read("data/products.json"));

/* ============================================================
   6. お知らせ（本番: 管理画面「フリーページ」＝WYSIWYG本文断片）
      ローカルの fr/N.html から本文（.freepage-body）だけを抜き、本番実例と同じ
      「本文HTML断片＋絶対URLリンク」に変換して production-build/fr/ へ出力。
   ============================================================ */
const frBuilt = [];
for (const n of ["1", "2", "3"]) {
  try {
    const src = read("fr/" + n + ".html");
    const title = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || ("お知らせ" + n);
    const m = src.match(/<div class="freepage-body wysiwyg-data">([\s\S]*?)<\/div>\s*<\/article>/);
    if (!m) continue;
    let body = m[1]
      .replace(/<!--[\s\S]*?-->/g, "")   // ▼▼▼ 本文 ▲▲▲ 等のマーカー除去
      .trim();
    body = wysiwygLinks(body);
    emit("fr/fr-" + n + ".html",
      `<!-- 本番フリーページ本文（管理画面のWYSIWYGへ貼付）｜タイトル: ${title} -->\n` + body + "\n");
    frBuilt.push("fr/fr-" + n + ".html（" + title + "）");
  } catch (e) { /* skip */ }
}

/* ============================================================
   7. LP（本番: /lp/{n} のWYSIWYG本文断片＝<style>＋本文）
      ローカル lp/<name>/index.html の <style> と .wysiwyg-data 内側を抽出し、
      本番実例（lp-clark.html 等）と同じ「<style>＋本文断片」に変換。
      画像はローカル相対パスのままなので、要アップロード（注記）。
   ============================================================ */
const LP_STD = ["lp-bear", "lp-beer", "lp-someya1", "lp-someya2", "lp-sanrio"]; // 標準構成(.wysiwyg-data)
const lpBuilt = [], lpManual = [];
for (const name of LP_STD) {
  try {
    // 本番用の別ソース(index.prod.html)があればそれを優先。
    // 例: lp-sanrio はローカルは dc-format(index.html)のまま、本番は静的版(index.prod.html)を使う。
    const prodPath = "lp/" + name + "/index.prod.html";
    const src = read(existsSync(join(ROOT, prodPath)) ? prodPath : "lp/" + name + "/index.html");
    const style = (src.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
    const cm = src.match(/<div class="wysiwyg-data">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!--\/\/container-->/);
    if (!cm) { lpManual.push(name + "（.wysiwyg-data 抽出不可）"); continue; }
    let content = cm[1].replace(/<!--\s*写真は[\s\S]*?-->/g, "").trim();
    content = wysiwygLinks(content);
    // ローカル相対パスの画像(./ ../)が残っている場合だけ、アップロード注記を付ける。
    // 既に本番CDN(image.raku-uru.jp)の絶対URLならアップロード不要なので注記しない。
    const hasLocalImg = /src="\.\.?\//.test(content);
    const imgNote = hasLocalImg
      ? "<!-- ⚠ 画像(src)にローカル相対パスが残存。らくうるカートへ画像をアップロードし https://image.raku-uru.jp/... のURLへ差し替えること -->\n"
      : "<!-- ✓ 画像(src)は本番CDN(image.raku-uru.jp)の絶対URL済み。アップロード差し替え不要 -->\n";
    const frag =
      "<!-- 本番LP本文（管理画面フリーページ/LPのWYSIWYGへ貼付。URLは /lp/{n} で公開） -->\n" +
      imgNote +
      "<style>\n" + style.trim() + "\n</style>\n" +
      content + "\n";
    emit("lp/" + name + ".html", frag);
    lpBuilt.push("lp/" + name + ".html");
  } catch (e) { lpManual.push(name + "（読み取り失敗）"); }
}
// lp-sanrio は元 dc-format(JS駆動)。本番用に lp-hokudai150year 方式(静的HTML＋素の<script>)へ
// 書き直した index.prod.html を用意済みで、上の LP_STD ループが自動変換する
// （ローカル index.html は dc版のまま。JSの挙動＝見どころスライダー/数量ステッパー/カート追加POSTは移植済み）。

/* ============================================================
   7. DEPLOY.md（移行手順・対応表）
   ============================================================ */
const deploy = `# production-build デプロイ手順（本番＝らくうるカートへの移行）

このフォルダは、ローカル再現環境を **本番（らくうるカート）へ移行できる形** に組み立てたものです。
ストアフロントは \`original/\`（本番テンプレ原本）を忠実に模倣した **Twigテンプレート構成** になっています。

## フォルダ構成と投入先
| フォルダ/ファイル | 中身 | 本番での投入先 |
|---|---|---|
| \`HTML/Common_Part.html\` | 共通枠（head/ヘッダ/ナビ/パンくず/サイドバー/フッタ/JS）＋差し込み口 | テーマ編集：共通テンプレート |
| \`HTML/Toppage.html\` | トップ本文（\`{{ dsnTop* }}\` / \`{% for %}\`） | テーマ編集：トップページ |
| \`HTML/Product_List.html\` | 商品一覧（\`{% for item in itemList %}\`＋ページャ） | テーマ編集：商品一覧 |
| \`HTML/Product_Details.html\` | 商品詳細（\`/incart\` フォーム・バリエーション・数量） | テーマ編集：商品詳細 |
| \`HTML/Product_Search.html\` | 検索結果 | テーマ編集：検索結果 |
| \`HTML/404_Not_Found.html\` | 404 | テーマ編集：404 |
| \`HTML/Landing_Page.html\` | LP枠（\`wysiwyg-data\` に本文差し込み） | テーマ編集：フリーページ/LP |
| \`HTML/Common_ID_Login.html\` / \`Members-Only_Login.html\` | ログイン画面 | テーマ編集：ログイン |
| \`css/*.css\` | テーマCSS（\`{{ cssAddr }}\` の実体） | テーマのCSSへアップロード |
| \`design-settings/*.html\` | トップの差し込み内容 | 管理画面「デザイン設定」の各欄に貼付 |
| \`data/products.json\` | 商品175件 | 管理画面「商品管理」へCSVインポート |
| \`fr/fr-*.html\` | お知らせ本文（WYSIWYG断片・絶対URL） | 管理画面「フリーページ」に本文貼付（トップは \`freepageList\` が自動掲載） |
| \`lp/lp-*.html\` | LP本文（\`<style>\`＋WYSIWYG断片） | 管理画面でLPフリーページを作成し本文貼付（\`/lp/{n}\` で公開） |
| \`cart/**\` | 取引画面（会員/カート/マイページ） | ASP標準画面。**店舗はHTML構造を編集不可**（本番の見た目確認用の参考） |

## 使われている本番Twig変数（主なもの）
- 共通: \`{{ shopName }}\` \`{{ shpUrl }}\` \`{{ shpCartUrl }}\` \`{{ shpHash }}\` \`{{ shpImgUrl }}\` \`{{ cssAddr }}\` \`{{ topFaviconUrl }}\`
- トップ: \`{{ dsnTopHtmlTag }}\` \`{{ dsnTopDesc1Shop }}\` \`{{ dsnTopDesc2Shop }}\` / \`freepageList\` \`itemRecentList\` \`itemRecommendList\`
- 一覧/詳細: \`{% for item in itemList %}\` \`itemData.*\` \`variationList\` \`{{ shpCartUrl }}/incart\`
- 取引: \`/getCss/{{ shpHash }}\` \`/resources/css\` \`/resources/js\` \`{{ _csrf }}\`

## 移行手順
1. **テーマHTML**：\`HTML/*.html\` をらくうるカートのテーマ編集画面の対応枠へ貼る（Common_Part＝共通、各ページ＝本文）。
2. **CSS**：\`css/*.css\` をテーマCSSへアップロード（\`{{ cssAddr }}\` が配信）。
3. **商品**：\`data/products.json\` をCSV化して商品インポート。画像は本番CDN（\`image.raku-uru.jp\`）を参照済み。
4. **デザイン設定**：\`design-settings/*.html\` を管理画面のデザイン設定（キービジュアル/ショップ説明1・2）に貼付。
5. **お知らせ**：\`freepages/fr-*.html\` をフリーページに登録。
6. **確認**：カテゴリ・在庫・バリエーション等はSSR（\`itemList\`/\`itemData\`）が描画。取引画面はASP標準。

## お知らせ（fr/）とLP（lp/）— 本日生成分
本番実例（\`original/fr\` \`original/lp\`）の規約を模倣し、ローカルのお知らせ/LPを**WYSIWYG本文断片**に変換したもの。

- お知らせ: ${frBuilt.length ? frBuilt.join(" / ") : "（なし）"}
- LP（自動変換）: ${lpBuilt.length ? lpBuilt.join(" / ") : "（なし）"}
- LP（手動対応が必要）: ${lpManual.length ? lpManual.join(" / ") : "（なし）"}

投入手順：
1. \`fr/fr-*.html\` の中身を管理画面「フリーページ」の本文（WYSIWYG）に貼付。タイトル/日付はフリーページの項目に設定。→ トップの「お知らせ」に \`freepageList\` として自動掲載。
2. \`lp/lp-*.html\` の中身をLP用フリーページ（\`Landing_Page\` テーマ）の本文に貼付。公開URL \`/lp/{n}\` を採番。
3. **画像**：各断片の \`src\` はローカル相対パスのまま。らくうるカートへ画像をアップロードし \`https://image.raku-uru.jp/...\` のURLへ差し替える。
4. リンクは本番の絶対URL（\`${SHOP_URL}/item-detail/… /item-list …\`）へ変換済み。

## 注意
- \`design-settings/top-message1.html\` のLPスライダーはローカル画像・\`/lp/…\`参照。**LP本体と画像は本番側で用意/ホスティング**が必要（\`HTML/Landing_Page.html\` を使用）。
- LPの \`<style>\` に \`body.body-lp #container{…}\` 等のローカル前提セレクタが含まれる場合あり（本番では無害だが不要なら削除）。
- \`lp-sanrio\` は元 dc-format（JS駆動）。本番用に lp-hokudai150year 方式（静的HTML＋素の\`<script>\`）へ書き直した \`lp/lp-sanrio/index.prod.html\` から自動変換。JSの挙動（見どころスライダー／数量ステッパー／カート追加POST）は移植済み。カート追加は \`cart.raku-uru.jp/incart\` への fire-and-forget POST（元の挙動のまま。確実な追加が必要ならフォーム送信への切替を検討）。ローカル \`index.html\` は dc版のまま。
- キャンペーンは \`Common_Part.html\` に汎用ループがあるが \`campaignList\` が空なら非表示（本番は未設定）。
- \`js/shop.js\` \`cart/assets/*\` はローカル専用のため本番へは持ち込まない（サーバーが描画/処理）。
`;
emit("DEPLOY.md", deploy);

/* ---------- 出力サマリ ---------- */
console.log("✅ production-build/ を本番移行可能な形（original模倣）で生成しました。");
console.log("   - HTML/            本番Twigテンプレート（Common_Part + 各ページ）");
console.log("   - css/             テーマCSS");
console.log("   - cart/            取引ページ（本番参照へ変換・参考）");
console.log("   - design-settings/ 管理画面デザイン設定へ貼るHTML");
console.log("   - fr/              お知らせ本文（WYSIWYG断片）: " + frBuilt.length + "件");
console.log("   - lp/              LP本文（WYSIWYG断片）: " + lpBuilt.length + "件（手動: " + lpManual.length + "件）");
console.log("   - data/            商品データ");
console.log("   - DEPLOY.md        デプロイ手順・対応表");
console.log("   （元のローカル/originalファイルは変更していません）");
