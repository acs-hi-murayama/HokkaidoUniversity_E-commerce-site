---
name: build-production
description: このローカル再現環境（北大オリジナルグッズ / らくうるカート）を、本番で動作する形に変換して新フォルダ production-build/ に出力し、らくうるカート管理画面へ移行する手順まで提供する。ストアフロントは original/（本番テンプレ原本）を模倣したTwigテンプレート、取引ページは本番参照、お知らせ/LPはWYSIWYG本文断片に変換する。既存のローカルファイルと original/ は絶対に変更しない。「本番化」「本番向けに変換」「production build」「デプロイ用に変換」「本番へ移行」などと言われたら使う。
---

# build-production — ローカル → 本番（らくうるカート）移行

ローカル再現環境を **本番（らくうるカート）へ移行できる形** に組み立てて
**新フォルダ `production-build/`** に出力し、らくうるカート管理画面へ投入するまでを扱う。

- ストアフロント（トップ/一覧/詳細/検索/404/ログイン）= `original/`（本番テンプレ原本）を忠実に模倣した **Twigテンプレート**（`Common_Part.html` + 各ページ本文）。
- 取引ページ（会員/カート/マイページ）= ローカル再現を **本番参照**へ変換（ASP標準画面なので確認用の参考）。
- お知らせ・LP = 本番実例（`original/fr` `original/lp`）の規約を模倣した **WYSIWYG本文断片**。
- 商品・デザイン設定 = 管理画面へ投入するデータとして書き出す。

## 絶対ルール（厳守）
- **リポジトリ直下のローカルファイル（index.html, css/, js/, cart/, data/, fr/, lp/ など）は一切変更しない。**
- **`original/` は本番テンプレ原本。参照専用**（変換元でも出力先でもない）。読むだけ、書かない。
- 生成物はすべて **`production-build/`（毎回作り直す新規フォルダ）** に書き出す。
- 実行後は `git status` で **`original/` に `M`（変更）が無い**こと、変更が `production-build/` 配下の新規追加だけであることを必ず確認する。

## 店舗定数
- `shpHash` = `47409ca9deadd2be6543f3c2fc49d40f`
- ストアフロント: `hokudai-goods-seikyou.net`（`{{ shpUrl }}`）
- 取引アプリ: `cart.raku-uru.jp`（`{{ shpCartUrl }}`）
- テーマID: `yt00037`（JSパス `cms/yt00037/...` に現れる識別子）
- WYSIWYG（お知らせ/LP）本文内は **Twig変数ではなく絶対URL直書き**（本番実例に準拠）。

---

## 手順1：変換スクリプトを実行して production-build/ を生成

リポジトリ直下で実行する：
```bash
node .claude/skills/build-production/transform.mjs
```

`transform.mjs` が行う変換（自動）：

| # | 出力 | 元 | 変換内容 |
|---|---|---|---|
| 1 | `production-build/HTML/` | `original/HTML/` | 忠実複製（本番Twigテンプレート＝共通枠＋各ページ本文） |
| 2 | `production-build/css/` | `original/css/` | 忠実複製（`{{ cssAddr }}` の実体） |
| 3 | `production-build/cart/**` | ローカル `cart/**` | 取引ページを本番参照へ変換（下記C表） |
| 4 | `production-build/design-settings/*.html` | `data/main-visual.html` `top-message1/2.html` | 相対パス補正（`./lp/`→`/lp/`, `./product-list?`→`/item-list?` 等）。管理画面デザイン設定へ貼付用 |
| 5 | `production-build/data/products.json` | `data/products.json` | 商品175件（CSVインポート元） |
| 6 | `production-build/fr/fr-*.html` | ローカル `fr/N.html` | `.freepage-body` 本文だけ抽出→マーカー除去→リンク絶対URL化。お知らせWYSIWYG断片 |
| 7 | `production-build/lp/lp-*.html` | ローカル `lp/<name>/index.html` | `<style>`＋`.wysiwyg-data`内側を抽出→リンク絶対URL化。LP WYSIWYG断片（画像は要アップロード注記付き） |
| 8 | `production-build/DEPLOY.md` | — | 移行手順・対応表・本日生成分の一覧・手動対応項目を自動生成 |

## 手順2：DEPLOY.md を読み、手動対応項目を仕上げる

生成された **`production-build/DEPLOY.md`** を必ず読む。機械変換できない／要手動の項目：

- **Twigループ**（`{% for item in itemList %}` 等）：ストアフロントは `original/HTML` 由来なので既に本番形式。ローカル独自に追加した描画があれば手動でTwig化。
- **LP画像**：`lp/lp-*.html` と `design-settings/top-message1.html` の `src` はローカル相対パス。らくうるカートへ画像をアップロードし `https://image.raku-uru.jp/...` のURLへ差し替える。
- **lp-sanrio**：dc-format（JS駆動スライダー）のため静的WYSIWYGへは**手動移植**が必要。
- **お知らせの文面**：`fr/fr-*.html` はローカルのサンプル文面。本番投入前に実際の文面へ差し替える（形式変換は完了済み）。

## 手順3：検証して報告する

```bash
# original/ が変更されていないこと（M が無い＝OK。?? の未追跡は可）
git status original/

# ストアフロントが original と一致していること（差分ゼロが理想）
diff -rq original/HTML production-build/HTML
diff -rq original/css  production-build/css

# WYSIWYG断片が本文だけか（DOCTYPE/html/header/footer が混入していないこと）
grep -lE '<!DOCTYPE|<html|<header|<footer' production-build/lp/*.html production-build/fr/*.html   # 何も出なければOK
```
確認できたら、生成物と手動対応項目を報告する。

---

## 移行先マッピング（production-build/ → らくうるカート管理画面）

| production-build 内 | 中身 | 本番での投入先 |
|---|---|---|
| `HTML/Common_Part.html` | 共通枠＋差し込み口（`<[-- MAIN_CONTENTS --]>` 他3口） | テーマ編集：共通テンプレート |
| `HTML/Toppage.html` | トップ本文（`{{ dsnTop* }}` / `freepageList`） | テーマ編集：トップページ |
| `HTML/Product_List.html` | 商品一覧（`{% for item in itemList %}`＋ページャ） | テーマ編集：商品一覧 |
| `HTML/Product_Details.html` | 商品詳細（`/incart` フォーム・バリエーション） | テーマ編集：商品詳細 |
| `HTML/Product_Search.html` | 検索結果 | テーマ編集：検索結果 |
| `HTML/404_Not_Found.html` | 404 | テーマ編集：404 |
| `HTML/Landing_Page.html` | LP枠（`wysiwyg-data` に本文差し込み） | テーマ編集：フリーページ/LP |
| `HTML/Common_ID_Login.html` / `Members-Only_Login.html` | ログイン | テーマ編集：ログイン |
| `css/*.css` | テーマCSS | テーマのCSSへアップロード |
| `design-settings/*.html` | トップ差し込み内容 | 管理画面「デザイン設定」の各欄に貼付 |
| `data/products.json` | 商品175件 | 管理画面「商品管理」へCSVインポート |
| `fr/fr-*.html` | お知らせ本文（WYSIWYG断片） | 管理画面「フリーページ」に本文貼付（トップは `freepageList` が自動掲載） |
| `lp/lp-*.html` | LP本文（`<style>`＋WYSIWYG断片） | LP用フリーページを作成し本文貼付（`/lp/{n}` で公開） |
| `cart/**` | 取引画面 | ASP標準画面。**店舗はHTML構造を編集不可**（見た目確認用の参考） |

## 参照の対応表（ローカル → 本番）

### A. ストアフロント（index / product-list / product-details / search / 404）
| ローカル | 本番（Twig） |
|---|---|
| `<link href="./css/common.css">` ほか | `<link href="{{ cssAddr }}" rel="stylesheet" type="text/css">` |
| favicon `contents.raku-uru.jp/.../favicon.ico` | `{{ topFaviconUrl }}` |
| `<script src="./js/shop.js">` + `Shop.load()...` インライン | 削除（本番はSSR）。描画は Twig `{% for item in itemList %}` |
| ヘッダ 会員登録 `/cart/member/regist/input/` | `{{ shpCartUrl }}/member/regist/input/{{ shpHash }}` |
| ヘッダ マイページ `/cart/mypage/login/` | `{{ shpCartUrl }}/mypage/login/{{ shpHash }}` |
| ヘッダ カート `/cart/cart/` | `{{ shpCartUrl }}/cart/{{ shpHash }}` |
| ロゴ/HOME `./index.html`・`/` | `{{ shpUrl }}` |
| お問合せ `cart.raku-uru.jp/ask/start/{hash}` | `{{ shpCartUrl }}/ask/start/{{ shpHash }}` |
| メインビジュアル `#js-main-visual` + `data/main-visual.html` | `{{ dsnTopHtmlTag }}` |
| ショップ説明1 `#js-top-message1` + `data/top-message1.html` | `{{ dsnTopDesc1Shop }}` |
| ショップ説明2 `#js-top-message2` + `data/top-message2.html` | `{{ dsnTopDesc2Shop }}` |

### B. ログイン（members-only-login / common-id-login）
| ローカル | 本番 |
|---|---|
| `<link href="./css/members-only-login.css">` | `{{ cssAddr }}` |
| インラインのデモJS | 本番は `common-script.js`/`shop-script.js` に委譲（削除） |

### C. 取引ページ（cart/cart, cart/member/regist/*, cart/mypage/*）
| ローカル | 本番 |
|---|---|
| `<link href="/cart/assets/cart-common.css">` | `<link href="/resources/css/cart-common.css">` |
| `<link href="/cart/assets/theme.css">` | `<link href="/getCss/{{ shpHash }}">` |
| jQuery CDN | `/resources/js/jquery-1.12.4.min.js` ほか（jquery-ui, flicksimple, blockUI, cart-script.js） |
| `<script src="/cart/assets/cart-app.js">` + インライン（`TX.*`） | 削除（本番はサーバー処理） |
| ロゴ `href="/"` | `{{ shpUrl }}` |
| フォーム | 先頭に `{{ _csrf }}` hidden を復元 |
| 内部リンク `/cart/member/regist/input/` 等 | `/member/regist/input/{{ shpHash }}` 等（末尾に `{{ shpHash }}`） |

### D. お知らせ / LP（WYSIWYG本文断片）
| ローカル | 本番（WYSIWYG） |
|---|---|
| `./product-details?id=X` | `https://hokudai-goods-seikyou.net/item-detail/X` |
| `./product-list?...` | `https://hokudai-goods-seikyou.net/item-list?...` |
| `members-only-login.html` | `.../member/regist/input/{shpHash}` |
| `common-id-login.html` | `.../mypage/login/{shpHash}` |
| `./index.html` | `https://hokudai-goods-seikyou.net/` |
| 画像 `./xxx.jpg`（相対） | **要アップロード** → `https://image.raku-uru.jp/...`（手動） |
| お知らせ本文 = ページ全体 | `.freepage-body` の本文だけ（`<p>` 断片・マーカー除去済み） |
| LP = 全ページ（DOCTYPE/head/header/footer） | `<style>` ＋ `.wysiwyg-data` 内側だけ |

---

## データ投入の補足
- `data/products.json`（商品175件）→ CSV化して管理画面「商品管理」へインポート。本番では `{% for item in itemList %}` が描画。
- `design-settings/*.html` → 管理画面「デザイン設定」の キービジュアル / ショップ説明1・2 へ貼付。
- `js/shop.js`, `cart/assets/*` は**ローカル専用**。本番へは持ち込まない（サーバーが描画/処理）。

## 本番ストアフロントの head/JS（差し戻し時の正しい形）
```html
<link href="{{ cssAddr }}" rel="stylesheet" type="text/css">
...
<script src="{{shpImgUrl}}/cms/yt00037/js/jquery-1.12.4.min.js"></script>
<script src="{{shpImgUrl}}/cms/yt00037/js/jquery-ui-1.11.4.min.js"></script>
<script src="{{shpImgUrl}}/cms/yt00037/js/jquery.flicksimple.js"></script>
<script src="{{shpImgUrl}}/cms/yt00037/js/common-script.js"></script>
<script src="{{shpImgUrl}}/cms/yt00037/js/shop-script.js"></script>
```
ヘッダ/フッタは本番では `Common_Part.html` に集約（各ページは MAIN_CONTENTS 部分のみ）。

## スクリプトを直す場合
変換ロジックは `transform.mjs` に集約されている。参照ルールを増減したら **この SKILL.md の対応表も同時に更新**し、`transform.mjs` は `production-build/DEPLOY.md` を自動再生成する（DEPLOY.md は手書きしない）。
