# らくうるカート サイト仕様書

本番サイト **[hokudai-goods-seikyou.net](https://hokudai-goods-seikyou.net/)** が動いている
ECプラットフォーム **「らくうるカート」** の仕様を、**原本テンプレート [`original/`](../original/) の実物**に基づいて
「どの変数が何を表し、どこがどう組み立てられているか」まで解像度高く解説します。

- 概要と対応づけ … [ARCHITECTURE.md](ARCHITECTURE.md)
- ローカルの操作手順 … [HOWTO.md](HOWTO.md)
- ローカル実装の仕様 … [LOCAL-SPEC.md](LOCAL-SPEC.md)（本書と対になるローカル側の技術仕様）
- 本書 … **らくうるカートそのものの仕様**（テンプレート／変数／URL／データモデル／テーマ）

> 📌 本書の記述はすべて `original/HTML/*.html`（本番テンプレート原本）と `original/css/`、
> および取引アプリ `cart.raku-uru.jp` の実挙動から抽出しています。行番号は原本ファイルのものです。

---

## 0. 用語と最重要の全体像

らくうるカートのショップは **2つのドメイン** に分かれています。ここを取り違えると「どのファイルを直せばよいか」を間違えるので、最初に押さえるべき最重要ポイントです。

| | ① ストアフロント | ② 取引アプリ |
|---|---|---|
| ドメイン | `hokudai-goods-seikyou.net`（独自ドメイン） | `cart.raku-uru.jp`（ASP共通ドメイン） |
| 担当 | **見せる**：トップ・商品一覧・商品詳細・LP・お知らせ | **売る**：会員登録・ログイン・マイページ・カート・レジ・お問合せ |
| HTML生成 | 店舗テーマ（Twigテンプレート）をサーバーがSSR | ASPの固定画面を店舗テーマCSSで薄く上書き |
| 店舗が編集できる範囲 | テンプレHTML/CSS・デザイン設定・商品 | **画面構造は不可**（色などテーマCSSと文言設定のみ） |

| 用語 | 意味 |
|---|---|
| **`shpHash`（店舗ハッシュ）** | `47409ca9deadd2be6543f3c2fc49d40f`。取引アプリのURL末尾に必ず付き、どの店舗かを識別する。Twigでは `{{ shpHash }}` |
| **Twig** | らくうるカートのテンプレートエンジン。`{{ 変数 }}` で値を埋め、`{% if %}` `{% for %}` で制御する |
| **テーマ** | 店舗ごとの見た目一式（テンプレHTML群＋CSS＋デザイン設定）。このショップのフロント用JS/画像は `{{shpImgUrl}}/cms/yt00037/…` から配信され、パス中の **`yt00037`** がこの店舗に割り当てられたテンプレート（テーマ）一式の識別子。JS/画像のURLでこの番号が確認できる |
| **デザイン設定** | 管理画面でトップの各ブロックの表示ON/OFFや見出し文言を決める設定。テンプレでは `dsnTop*` 変数として現れる |

---

## 1. ストアフロントの組み立て方

ストアフロントの全ページは、**共通枠 `Common_Part.html` の中に、各ページ本体を流し込んで**1枚のHTMLになります。

```
Common_Part.html（共通枠：<head> / ヘッダー / ナビ / パンくず / サイドバー / フッター / JS）
      │
      │  <[-- MAIN_CONTENTS --]> の位置に ↓ のいずれかが差し込まれる
      ├─ Toppage.html          → トップ（/）
      ├─ Product_List.html     → 商品一覧（/item-list）
      ├─ Product_Details.html  → 商品詳細（/item-detail/{itemId}）
      ├─ Product_Search.html   → 検索結果（/search）
      └─ Landing_Page.html     → LP・フリーページ
```

### 差し込みプレースホルダ（`<[-- … --]>`）
`Common_Part.html` にある **3つの差し込み口**。`{{ }}`（変数の埋め込み）とは別物で、`<[-- … --]>` という独自記法。
サーバーがビルド時に、この位置へ該当HTMLを流し込みます。

| プレースホルダ | 位置（Common_Part.html） | 差し込まれるもの |
|---|---|---|
| `<[-- MAIN_CONTENTS --]>` | 147行 `.two-column` 内 | 各ページ本体（Toppage / Product_List …） |
| `<[-- HEADER_CUSTOM_CONTENTS --]>` | 30行 `</head>`直前 | 店舗が追加する `<head>`内カスタム（計測タグ等） |
| `<[-- BODY_CUSTOM_CONTENTS --]>` | 342行 `</body>`直前 | 店舗が追加する`<body>`末尾カスタム（チャット等） |

> ログイン画面（`Common_ID_Login.html` / `Members-Only_Login.html`）やLP（`Landing_Page.html`）は `Common_Part.html` を使わない独立ページだが、
> `HEADER_CUSTOM_CONTENTS` / `BODY_CUSTOM_CONTENTS` / `MAIN_CONTENTS` の同じ記法を各自で持つ。

> **ローカルとの対応**：ローカルは共通枠を各HTMLに**コピーして直書き**している（サーバーが無いため）。
> だからヘッダー/フッターを直すときは全ローカルHTMLを横断修正する必要がある（[HOWTO.md](HOWTO.md) 参照）。

### `<head>` の構成（Common_Part.html 8〜43行）
| 行 | 内容 | 使う変数 |
|---|---|---|
| 8 | `<title>` … 優先順位つきで自動生成 | `dsnTopTitle` → `pageTitle` → `categoryPageTtl` → `itemData.title` → … → `shopName` |
| 11-16 | 商品詳細時のOGP | `itemData.metadescription` / `itemData.ogImageUrl` / `itemData.ogTitle` / `thisUrl` |
| 22-24 | ファビコン | `topFaviconUrl` |
| 26 | **テーマCSS** | `cssAddr`（後述） |
| 31-34 | robots / canonical / prev / next | `robots` `canonicalUrl` `prevUrl` `nextUrl` |

> `<title>` は「トップならデザイン設定のタイトル、商品詳細なら商品名、無ければショップ名」という
> **フォールバックの連鎖**で決まる（8行の `{% if … elseif … %}`）。これがSEOタイトルの実体。

---

## 2. Twig 変数リファレンス

テンプレート内の `{{ 変数 }}` に、サーバーが実データを入れて出力します。ここに挙げるのは**すべて原本 `original/HTML/*.html` に実在する変数**。本番へ戻すとき、ローカルのダミー値をどの変数に置換すべきかの索引として使えます。

### 2-1. ショップ共通（どのページでも使える）
| 変数 | 意味 | 例・備考 |
|---|---|---|
| `{{ shopName }}` | ショップ名 | title・コピーライト・OGPで多用 |
| `{{ shpUrl }}` | ストアフロントのURL | SNS共有・OGPで使用 |
| `{{ shpCartUrl }}` | 取引アプリのベースURL | `cart.raku-uru.jp`。会員/カート/マイページ導線の先頭 |
| `{{ shpHash }}` | 店舗ハッシュ | 取引アプリURLの末尾に必須 |
| `{{ shpImgUrl }}` | 画像・JS配信のベース | `{{shpImgUrl}}/cms/yt00037/js/…`（後述のJS群） |
| `{{ cssAddr }}` | テーマCSSのURL | `<link href="{{ cssAddr }}">`。1本で全ストアフロントの見た目 |
| `{{ topFaviconUrl }}` | ファビコンURL | 未設定なら出力されない（22行 `{% if %}`） |
| `{{ thisUrl }}` | 現在ページのURL | OGP `og:url` |

### 2-2. 表示制御フラグ
ヘッダー等の要素は**フラグが1のときだけ**描画されます（Common_Part.html）。

| フラグ変数 | 1のとき | 原本の行 |
|---|---|---|
| `hdrLogoDispFlag` / `hdrLogoImageUrl` | ヘッダーに画像ロゴ、無ければ文字ロゴ | 51-55 |
| `ftrLogoDispFlag` / `ftrLogoImageUrl` | フッターに画像ロゴ | 275-279 |
| `newMemRegistFlag` | 「会員登録」リンクを表示 | 59, 82 |
| `registValidFlag` | 会員機能ON（マイページ/会員規約リンク） | 62, 85, 287 |
| `cartLoginStatus` | ログイン中（`==1`で`<body class="login">`／ログアウトリンク表示） | 46, 63 |
| `askpageUseFlag` | お問合せリンクを表示 | 288 |

### 2-3. トップページ
トップ [Toppage.html](../original/HTML/Toppage.html) は**7ブロック**で構成され、各ブロックは
「表示フラグ」「見出し1/2」「本文」の変数を持ちます。管理画面の「デザイン設定」がこれらの実体です。

| ブロック | 表示フラグ | 見出し | 本文/データ |
|---|---|---|---|
| キービジュアル | `dsnTopVisualDispFlag` | ― | `dsnTopHtmlTag`（大バナーHTML） |
| フリー1 | `dsnTopDispFlag1Shop` | ― | `dsnTopDesc1Shop`（自由HTML） |
| お知らせ | `dsnTopDispFlagInfo` | `dsnTopTitle1Info` / `dsnTopTitle2Info` | `freepageList`（自動） |
| 新着 | `dsnTopDispFlagNewItem` | `dsnTopTitle1NewItem` / `2` | `itemRecentList`（自動） |
| おすすめ | `dsnTopDispFlagRanking` | `dsnTopTitle1Ranking` / `2` | `itemRecommendList`（自動） |
| 販売ランキング | `dsnTopDispFlagSalesRanking` | `dsnTopTitle1SalesRanking` / `2` | `itemSalesRankingList`（自動） |
| フリー2 | `dsnTopDispFlag2Shop` | ― | `dsnTopDesc2Shop`（自由HTML） |

> **ローカルとの対応**：`dsnTopHtmlTag`→`data/main-visual.html`、`dsnTopDesc1Shop`→`data/top-message1.html`、
> `dsnTopDesc2Shop`→`data/top-message2.html`。新着/おすすめは `js/shop.js` が `products.json` から生成。

### 2-4. 商品表示
`{% for item in itemList %}`（一覧）や `itemRecentList`（新着）などのループ内で使える主要フィールド。

| フィールド | 意味 | 使用箇所 |
|---|---|---|
| `item.itemId` | システム商品番号 | `/item-detail/{{ item.itemId }}` |
| `item.itemName` | 商品名 | カード見出し・alt |
| `item.displayPrice` | 表示価格（整形済） | `¥380` 等 |
| `item.displayTax` | 税表記 | `(税込)` 等 |
| `item.dispMediaUrlSmall` / `item.mediaUrlSmall` | サムネイル画像URL（表示用/元） | `<img src>` |
| `item.badgeId` | バッジ種別 | `class="… icon-badge{{ item.badgeId }}"` |
| `item.shpRsvFlag` | 予約商品フラグ | `1`で`icn-reservation`クラス |
| `item.stockOutMessage` | 在庫切れ表示文 | あれば`.item-nonstock`で出す |
| `item.variationName` | バリエーション名 | 販売ランキングで表示 |

### 2-5. 商品詳細
[Product_Details.html](../original/HTML/Product_Details.html) で使う商品1件の詳細。

| フィールド | 意味 |
|---|---|
| `itemData.itemId` | 商品ID（カート投入フォームのhidden） |
| `itemData.itemName` / `itemData.title` | 商品名 / ページタイトル |
| `itemData.metadescription` / `ogImageUrl` / `ogTitle` / `ogType` | OGP・メタ |
| `itemData.carriage` | 送料（`numberformat("#,##0")`で整形） |
| `itemData.itemAttrPtrn` | 属性パターン（`2`なら選択/入力欄を描画） |
| `itemData.numericFormType` | 数量入力の型（`1`=＋−カウンタ / `2`=セレクト / `3`=固定1） |
| `itemData.quantityLowLimit` / `quantityUpLimit` | 購入数量の下限/上限 |
| `itemData.onSale` / `itemData.stockExist` | 販売中か / 在庫があるか（`0`以外で「カートに入れる」表示） |

### 2-6. 一覧のページング・並び替え
| 変数 | 意味 |
|---|---|
| `title1` / `title2` | 見出し（カテゴリ名など）/ サブ見出し |
| `description` | リード文（あれば `.lead-txt`） |
| `totalCount` / `startNum` / `endNum` | 総件数 / 表示範囲 |
| `sortKind` | 並び順（`1`低価格 / `2`高価格 / `3`更新日） |
| `condition` | 現在の絞り込み条件（URLに連結する） |
| `pageIndex` / `pageList` / `backPageVisible` / `nextPageVisible` | ページ番号・前後リンク制御 |

---

## 3. Twig 制御構文の読み方

原本を読むために必要な専用構文は以下です。

```twig
{{ 変数 }}                         値を出力
{{ 値 | numberformat("#,##0") }}   フィルタで整形（例：1000 → 1,000）

{% if A == 1 %} … {% elseif B %} … {% else %} … {% endif %}   条件分岐
{% for item in list %} … {% endfor %}                          繰り返し
{% set x = 0 %}                                                変数代入

ループ内の特殊変数：
  loop.index    0始まりの番号（Toppage の rank{{ loop.index + 1 }} で順位に使用）
  loop.length   総数（パンくずの「最後だけリンク無し」判定 Common_Part 135行）
```

**実例（Common_Part.html 135-139：パンくずの最後だけ`<strong>`にする）**
```twig
{% for item in breadCrumbsList %}
  {% if loop.index < loop.length - 1 %}
    <li><a href="{{ item.url }}">{{ item.displayValue }}</a></li>   ← 途中はリンク
  {% else %}
    <li><strong>{{ item.displayValue }}</strong></li>              ← 最後は現在地
  {% endif %}
{% endfor %}
```

---

## 4. URL 体系（ルーティング仕様）

### 4-1. ストアフロント（hokudai-goods-seikyou.net）
原本テンプレ内の実リンクから確定した本番URLです。

| URL | 画面 | パラメータ | 出典 |
|---|---|---|---|
| `/` | トップ | ― | ロゴ `href="/"` |
| `/item-list?categoryId={id}` | カテゴリ別一覧 | `categoryId` | Common_Part 100 |
| `/item-list?campaignId={id}` | キャンペーン別一覧 | `campaignId` | Common_Part 121 |
| `/item-list?sortKind={1-3}&pageIndex={n}` | 並び替え・ページング | `sortKind`,`pageIndex`,`condition` | Product_List 26-77 |
| `/item-detail/{itemId}` | 商品詳細 | パスに`itemId` | 商品カードのリンク |
| `/search`（POST） | 検索結果 | `searchWord` | Common_Part 73 |
| `/fr/{freepageSerialNo}` | フリーページ/お知らせ | パスに通し番号 | Toppage 26 |
| `/law` `/privacy` `/fee` `/membership` | 規約系 | ― | フッター 284-287 |

> **ローカルの命名差**：本番は `/item-list`・`/item-detail/{id}`となっている。ローカルは `serve` の都合で
> `product-list?categoryId=`・`product-details?id=`（拡張子なし）にしている。移行時はここを本番名に戻す必要がある。

### 4-2. 取引アプリ（cart.raku-uru.jp）
規則的なURLで、各画面に **画面ID**（`<body id>` で確認可）が割り振られています。

| 画面 | URL | 画面ID |
|---|---|---|
| ショッピングカート | `/cart/{shpHash}` | CBY0001D01 |
| 会員登録 入力 | `/member/regist/input/{shpHash}` | MEM0001D01 |
| 会員登録 確認 | `/member/regist/confirm/{shpHash}` | MEM0001D02 |
| 会員登録 完了 | `/member/regist/complete/{shpHash}` | MEM0001D03 |
| ログイン | `/mypage/login/{shpHash}` | MYP0001D01 |
| マイページ本体 | `/mypage/{shpHash}` | MYP0002D01 |
| ログアウト | `/logout/{shpHash}` | ― |
| お問合せ | `/ask/start/{shpHash}` | ― |
| カート投入 | `/incart`（POST） | ― |

---

## 5. カート投入の仕組み

「カートに入れる」は、商品詳細ページの**フォームPOST**で取引アプリへ送られます。

**Product_Details.html の構造（要点）**
```twig
<form action="{{ shpCartUrl }}/incart" method="post" id="cms0002d02Form">   ← 2行目
  … バリエーション選択（variationId）
  … 属性選択/入力（attrValues）※ itemAttrPtrn==2 のとき
  … 数量（itemQuantity）※ numericFormType で ＋−/セレクト/固定 を切替
  <input type="hidden" name="itemId" value="{{ itemData.itemId }}">          ← 316行
</form>
```

| 送信フィールド | 内容 | 制御変数 |
|---|---|---|
| `itemId` | 商品ID（hidden・必須） | `itemData.itemId` |
| `variationId` | 選択バリエーション | `variationList` |
| `attrValues` | 属性（名入れ等の選択/自由入力） | `itemAttrPtrn == 2` |
| `itemQuantity` | 数量 | `numericFormType`（1=カウンタ/2=セレクト/3=固定1） |

- 「カートに入れる」ボタンは `onSale != 0` かつ `stockExist != 0` のときだけ表示（179-185行）。
  在庫切れは「在庫切れのため注文いただけません。」（188行）。

> **ローカルとの対応**：ローカルは同じ操作を `cart/assets/cart-app.js` が受けて **localStorage** に格納。
> 本番は `/incart` POST 後、`cart.raku-uru.jp` のカート画面（CBY0001D01）へ遷移する。

---

## 6. テーマ・CSS・JS の仕組み

### 6-1. CSS は2系統
| 系統 | 参照 | 実体 | 役割 |
|---|---|---|---|
| ストアフロント | `<link href="{{ cssAddr }}">` | テーマCSS（`original/css/common.css` 等が元） | トップ〜商品詳細の見た目 |
| 取引アプリ | `/resources/css/cart-common.css` + `/getCss/{shpHash}` | ASP共通CSS ＋ **動的生成テーマCSS** | カート/会員/マイページの見た目 |

**`getCss/{shpHash}` が肝**：らくうるカートは、管理画面で設定した色（ボタン色・帯色・リンク色）を
**サーバーがCSSとして動的生成**して配信します。取引アプリの色はここで決まります。

| テーマ色（このショップ） | 値 | 用途 |
|---|---|---|
| リンク色 | `#044389` | `a { color }` |
| リンクhover | `#5995ed` | |
| ボタン色 | `#0f4c5c` | `.btn` 背景 |
| ヘッダー/フッター/ステップ帯 | `#e9bc00`（北大の黄） | 見出し帯・進行ステップ |

> **ローカルとの対応**：`getCss` の出力を取得して `cart/assets/theme.css` に固定化してある。
> 色を変えるならローカルは `theme.css`、本番は**管理画面のデザイン設定**（→`getCss`が再生成）。

### 6-2. JavaScript の読み込みセット
**ストアフロント**（Common_Part.html 305-341）：
```
{{shpImgUrl}}/cms/yt00037/js/jquery-1.12.4.min.js
                              jquery-ui-1.11.4.min.js
                              jquery.flicksimple.js
                              common-script.js      ← ASP共通の挙動
                              shop-script.js         ← 店舗テーマの挙動
+ slick-carousel（CDN）        ← トップのバナースライダー（.full-screen）
```
**取引アプリ**：`/resources/js/` 配下に jQuery / jquery-ui / flicksimple / blockUI / `cart-script.js` ＋
画面別JS（例：会員登録入力なら `mem/mem0001d01.js`）を ASP が自動付与。

> `cms/yt00037/` は、このショップのフロント用JS/画像が置かれた配信フォルダ。`yt00037` がテンプレート（テーマ）一式の識別子で、
> ストアフロントのJS・画像URLに現れる（§0のテーマ欄参照）。

---

## 7. らくうるカート管理画面について

らくうるカート管理画面の「どこを触れば変わるか」を、本番運用の観点で切り分けます。

| 変えたいもの | 本番での操作場所 | テンプレ上の変数 |
|---|---|---|
| ショップ名・ロゴ・ファビコン | トップページ設定 > メインビジュアル設定 | `shopName` `hdrLogoImageUrl` `topFaviconUrl` |
| トップの各ブロックON/OFF・見出し | トップページ設定 > メインビジュアル設定 | `dsnTopDispFlag*` `dsnTopTitle*` |
| キービジュアル・フリー欄の中身 | マイテンプレート > フリーページ | `dsnTopHtmlTag` `dsnTopDesc1/2Shop` |
| 商品（名前/価格/画像/在庫/バリエーション） | 管理画面 商品管理 | `itemList` / `itemData.*` |
| カテゴリー・キャンペーン | 管理画面 商品管理 | `categoryList` `campaignList` |
| お知らせ（フリーページ） | マイテンプレート > フリーページ | `freepageList` → `/fr/{no}` |
| 取引画面の色 | 管理画面 デザイン設定（テーマ色） | `getCss/{shpHash}` が再生成 |
| 会員機能・お問合せの有無 | 管理画面 顧客管理 | `registValidFlag` `newMemRegistFlag` `askpageUseFlag` |
| ページ共通のHTML構造（ヘッダー等） | マイテンプレート > **テーマHTMLの編集**（Common_Part 等） | テンプレ直接 |
| 商品ページのレイアウト | マイテンプレート > テーマHTMLの編集（Product_*.html） | テンプレ直接 |

> ポイント：**トップの内容・商品・色・お知らせは「管理画面の設定」**で変わり、
> **ページの骨格（HTML構造）だけがテンプレHTMLの編集**。取引アプリの画面構造は店舗側では変えられない。


---

## 参考
- 本番構造の図解 … [ARCHITECTURE.md](ARCHITECTURE.md)
- ローカル操作手順 … [HOWTO.md](HOWTO.md)
- ローカル↔原本の対応 … [MAPPING.md](MAPPING.md)
- 原本テンプレート … [original/HTML/](../original/HTML/)（**分析専用・変更禁止**）
