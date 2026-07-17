# ローカル再現サイト 仕様書（実装詳解）

このローカル環境が **どう作られていて、どのファイル／関数／データが何を担っているか** を、
実装の実物（`js/shop.js`・`cart/assets/cart-app.js`・`data/products.json` など）に基づいて解説します。
行番号は各実ファイルのものです。各節は「**なぜそうしているか／何をしているか／本番の何に対応するか**」を添えています。

- 概要・起動 … [../README.md](../README.md)
- 操作手順（何を変えると何が変わる） … [HOWTO.md](HOWTO.md)
- **本書** … ローカル実装の**技術仕様**（描画のしくみ・データ・保存・URL規約）
- 対になる本番仕様 … [RAKUURU-SPEC.md](RAKUURU-SPEC.md)（らくうるカート側の仕様）

---

## 0. 技術スタックと方針

本番のらくうるカートは、サーバーがTwigテンプレートに商品データを流し込んでHTMLを組み立て、完成品をブラウザに返します（SSR）。
このローカル環境には**サーバーもDBもありません**。その組み立てを**ブラウザ側のJavaScriptが肩代わり**しています。

```
本番   : ブラウザ ←（完成HTML）← サーバー（Twig SSR + DB）
ローカル: ブラウザ ← 静的HTML + JS。JSが起動後に JSON/HTML断片を fetch して自分で組み立てる
```

| 項目 | 内容 | 補足 |
|---|---|---|
| 種別 | **静的サイト**（サーバー言語・DB・ビルド無し） | HTML/CSS/JS を置くだけ |
| 配信 | `npx.cmd serve . -l 3000` | Node製の静的ファイルサーバー |
| 依存ライブラリ | jQuery 1.12.4 ＋ slick-carousel（CDN） | slick はトップのバナースライダーで使用 |
| 自作JS | `js/shop.js`（商品表示）／`cart/assets/cart-app.js`（カート・会員・注文） | この2つが処理の中心 |
| データ | `data/products.json`（商品175件）＋ `data/*.html`（差し込み用の部品HTML） | 表示内容を外部データ化し、JSが読む |
| 状態保存 | ブラウザの **localStorage / sessionStorage** | サーバーDBの代替（§5-2） |

**方針**：本番の外枠（HTML構造・class名・URLパス）はできる限り保ち、動的処理だけをJSで仮実装している。
これにより、本番へ戻すときは**JS層をサーバー処理へ差し替えるだけ**で済む。

---

## 1. 商品を描画するJS `js/shop.js`（描画エンジン）

### 役割
本番ではサーバーが商品カードのHTMLを組み立てる。ローカルではその役を `js/shop.js` が**ブラウザ内で**担う。
やることは「**データ取得 → 絞り込み・並べ替え → 1件ずつHTML化 → DOMへ流し込む**」の一連の処理。本書ではこれを**描画エンジン**と呼ぶ。

読み込むと `window.Shop` という名前空間が用意され、各ページの `<script>` は `Shop.〇〇()` を呼ぶだけで商品を表示できる。
以降の `Shop.〇〇` はすべてこの名前空間の関数。

### 1-1. 処理の流れ（トップ・一覧が出るまで）
```
ページ読込
  └─ Shop.load()                 data/products.json を fetch（結果はキャッシュ。2回目以降は即返す）
        └─ Shop.published(all)   published==="1" かつ active==="1" に絞る
              └─ 絞り込み・並べ替え（categoryId / sortKind / searchWord）
                    └─ Shop.fill("#js-...", 配列を map(Shop.card).join("") でHTML化)  → DOMへ
```
要点：**読み込みは1回だけ**（`load` が内部キャッシュを持つ）、**最後に `fill` でまとめて反映**。

### 1-2. `Shop` API（js/shop.js）
行＝`js/shop.js` の行番号。

| メンバー | 行 | 内容 |
|---|---|---|
| `Shop.load()` | 37 | `products.json` を fetch し `Promise<商品配列>` を返す。結果はキャッシュ |
| `Shop.published(list)` | 58 | 公開商品だけに絞る（`published==="1" && active==="1"`） |
| `Shop.byId(list, id)` | 60 | `itemId` 一致の1件を返す（詳細ページ用） |
| `Shop.param(name)` | 67 | URLクエリを取得（`URLSearchParams` のラッパ） |
| `Shop.card(p)` | 73 | 商品1件を通常の商品カードHTMLにする（一覧・新着・検索） |
| `Shop.rankCard(p, i)` | 87 | 順位バッジ付きカードHTML（`i`は0始まり→`rank{i+1}`） |
| `Shop.fill(sel, html)` | 101 | `sel` の `innerHTML` を差し替える |
| `Shop.include(sel, url)` | 109 | 別HTMLを fetch して `sel` に注入（§3。本番 `dsnTopDesc` 相当） |
| `Shop.loadNews()` | 126 | `data/news.json` を fetch（本番 `freepageList` 相当） |
| `Shop.newsRow(item)` | 138 | お知らせ1件を `<dt>日付</dt><dd><a href="./fr/{no}.html">…</a></dd>` にする |
| `Shop.renderNews(sel, limit)` | 145 | お知らせを新しい順に最新`limit`件だけ描画（省略で全件） |
| `Shop.yen(n)` | 47 | `729` → `¥729`（`toLocaleString`） |
| `Shop.esc(s)` | 49 | `& < > "` をエスケープ |
| `Shop.detailUrl(p)` | 55 | 詳細リンク文字列 `./product-details?id=…`（§4の拡張子なし規約） |
| `Shop.categories` | 18 | カテゴリの「ID→表示名」対応表（§1-3） |
| `Shop.categoryName(id)` | 33 | カテゴリID→日本語名（無ければ `null`） |

> `card()` と `rankCard()` の違いは順位バッジ（`.icon-rank rank{n}`）の有無だけ。どちらも本番の商品カード（`.list-product li`）と同一class構造。

### 1-3. カテゴリの対応表（js/shop.js 18〜31行）
商品データは分類を `CG-00001` のようなIDでしか持たない。これを表示名（「食品」等）に変換する対応表が `CATEGORIES`。
本番はこの対応をサーバーが供給するが、ローカルはこの定数で代替する。

| categoryId | 表示名 | categoryId | 表示名 |
|---|---|---|---|
| CG-00004 | ウェア | CG-00016 | 革製品グッズ |
| CG-00001 | 食品 | CG-00018 | ガラスジュエリー |
| CG-00002 | 酒類 | CG-00015 | 寮歌CD |
| CG-00003 | 文具 | CG-00008 | その他 |
| CG-00019 | 小物 | CG-00007 | おしょろ丸グッズ |
| CG-00017 | 生活雑貨 | CG-00014 | ミズナラグッズ |

> カテゴリを増減・改名するときは、この `CATEGORIES` と各ページのカテゴリリンク（`?categoryId=CG-000xx`）の両方をそろえる。

---

## 2. 商品データ `data/products.json`

商品オブジェクトの配列（**175件**）。本番の商品DBに相当し、`js/shop.js` がこれを読んで描画する。
生成元は本番の商品エクスポートCSV。

1件の実データ（先頭商品）：
```jsonc
{
  "itemId": "01-14604-T000000016-001",   // 主キー。詳細ページの ?id= と突き合わせる
  "name": "北海道ミルククッキー札幌農学校 12枚入り",
  "price": 729,                           // 数値（円・税込）
  "tax": "内税",                          // 税区分表示
  "itemCode": "",                         // 店舗商品コード（任意）
  "jan": "",                              // JANコード（任意）
  "categoryId": "CG-00001",               // カテゴリ（§1-3の対応表とセット）
  "campaignId": "",                       // キャンペーン（未使用）
  "imageUrl": "https://image.raku-uru.jp/...jpg",          // メイン画像（本番CDNを直参照）
  "otherImages": ["https://image.raku-uru.jp/...", "..."], // サブ画像
  "info1": "<style>…</style><section>…商品説明HTML…</section>", // 詳細ページ本文（HTMLがそのまま入る）
  "isNew": "0",                           // "1"=新着（トップ新着枠で使用）
  "published": "1",                       // "1"=公開
  "active": "1"                           // "1"=有効
}
```

| フィールド | 型 | 用途 | 補足 |
|---|---|---|---|
| `itemId` | string | 主キー。詳細URL `?id=` と照合 | 長い複合ID形式 |
| `name` | string | 商品名（カード・詳細・alt） | |
| `price` | number | 税込価格。`Shop.yen()` で整形 | |
| `tax` | string | 税区分表示 | 例 `内税` |
| `categoryId` | string | 分類。一覧の絞り込みキー | §1-3で表示名に変換 |
| `imageUrl` / `otherImages` | string / string[] | 商品画像 | 本番CDNを直接参照 |
| `info1` | string(HTML) | 詳細ページ本文 | `<style>` 込みの完成HTML |
| `isNew` | `"0"`/`"1"` | 新着判定 | トップ新着枠で使用 |
| `published` / `active` | `"0"`/`"1"` | 公開 / 有効 | **両方 `"1"` の商品だけ**表示（`Shop.published`） |

> **ハマりどころ**：フラグは**数値 1 ではなく文字列 `"1"`**。保存は **BOMなしUTF-8**（BOM付きだと fetch().json() 前段で壊れることがある）。
> 追加・編集手順は [HOWTO.md](HOWTO.md) と [../README.md](../README.md) 3-1。

---

## 3. トップへの差し込み `Shop.include`

### なぜ別ファイルに分けるのか
変わりやすい部分（キービジュアル・挨拶文・案内文）を `index.html` に直書きすると保守が重くなる。
そこで**部品HTMLに切り出し、表示時に `Shop.include()` が fetch して所定の `<div id="…">` に流し込む**。
本番が管理画面の入力（`{{ dsnTopDesc1Shop }}` 等）をSSRで差し込むのと同じ役割・同じ差し込み口の考え方。

| index.html の要素 | 注入元 | 本番の対応 |
|---|---|---|
| `#js-main-visual` | `data/main-visual.html` | `dsnTopHtmlTag` |
| `#js-top-message1` | `data/top-message1.html` | `dsnTopDesc1Shop`（挨拶＋LPスライダー） |
| `#js-top-message2` | `data/top-message2.html` | `dsnTopDesc2Shop`（下部案内） |
| `#js-new` | `products.json`（`isNew`抽出） | `itemRecentList` |
| `#js-recommend` | `products.json` | `itemRecommendList` |
| `#js-news` | `data/news.json`（`renderNews` が最新N件） | `freepageList` |

**index.html の描画スクリプト（抜粋）**
```js
Shop.load().then(function (all) {
  var pub  = Shop.published(all);
  var news = pub.filter(function (p) { return p.isNew === "1"; });
  if (news.length < 3) news = pub;                       // 新着が3件未満なら公開品で補完
  Shop.fill("#js-new",       news.slice(0, 3).map(Shop.card).join(""));      // 新着 3件
  Shop.fill("#js-recommend", pub.slice(0, 6).map(Shop.rankCard).join(""));   // おすすめ 6件
});
Shop.include("#js-main-visual", "./data/main-visual.html");
Shop.include("#js-top-message2", "./data/top-message2.html");
Shop.include("#js-top-message1", "./data/top-message1.html").then(function () {
  if (window.jQuery && $.fn.slick) { $(".full-screen").slick({ … }); }        // 注入完了後に起動
});
```

> **注意**：`include` は非同期。slick は差し込み完了後に起動しないと対象要素が空で初期化されるため、`.then()` 内で呼ぶ。

---

## 4. URL規約

`serve` は既定（cleanUrls）で `page.html?x=1` を `/page` へ301リダイレクトし、その際**クエリ文字列を落とす**。
そのため「カテゴリで絞ったのに全件出る」といった不具合が起きる。回避策として、
**クエリ付きの内部リンクは `.html` を付けない**（リダイレクトを起こさせずクエリを保持する）。

- 例：`product-list?categoryId=CG-00002` ／ `product-details?id=…` ／ `search?searchWord=…`

| 論理ページ | ローカルURL | 実ファイル | 主なクエリ |
|---|---|---|---|
| トップ | `/` | `index.html` | ― |
| 商品一覧 | `/product-list?categoryId=&sortKind=` | `product-list.html` | `categoryId`, `sortKind`（1=安い順/2=高い順） |
| 商品詳細 | `/product-details?id=` | `product-details.html` | `id`（=itemId） |
| 検索 | `/search?searchWord=` | `search.html` | `searchWord` |
| お知らせ | `/fr/{n}.html` | `fr/{n}.html` | ―（クエリ無しなので拡張子ありでOK） |
| LP | `/lp/lp-〇〇/` | `lp/lp-〇〇/index.html` | ―（**末尾スラッシュ必須**） |
| 404 | 存在しないパス | `404.html` | ― |

> 本番のURL体系は `/item-list`・`/item-detail/{id}`。移行時はこの本番名へ戻す（`build-production` スキルが変換）。

### ページ別の描画ロジック
| ページ | 処理 |
|---|---|
| **一覧** `product-list.html` | 公開品→`categoryId`絞込→カテゴリ名で見出し/パンくず/リード更新→`sortKind`で価格ソート→`#js-list`描画→件数表示 |
| **詳細** `product-details.html` | `Shop.param("id")`→`Shop.byId`で特定→名前/価格/画像/`info1`差し込み→「カートに入れる」で `TX.addToCart` |
| **検索** `search.html` | `searchWord` を `name` に部分一致フィルタ→`Shop.card`描画 |

**一覧の絞り込み（product-list.html 要点）**
```js
var list = Shop.published(all);
var cat  = Shop.param("categoryId");
if (cat) {
  list = list.filter(function (p) { return p.categoryId === cat; });   // カテゴリ絞込
  // 見出し(#js-cat-title)・パンくず(#js-crumb)・リード(#js-cat-lead)をカテゴリ名で更新
  // 並び替えリンクに &categoryId= を付与し、絞り込みを維持
}
var sort = Shop.param("sortKind");
if (sort === "1") list.sort((a,b)=>a.price-b.price);       // 価格の低い順
else if (sort === "2") list.sort((a,b)=>b.price-a.price);  // 価格の高い順
Shop.fill("#js-list", list.map(Shop.card).join(""));
```

---

## 5. 取引レイヤー `cart/`（カート・会員・注文）

`cart/` は本番 `cart.raku-uru.jp` の画面（カート・会員登録・マイページ）を忠実再現したページ群。
動きは `cart/assets/cart-app.js` の `window.TX` が **localStorage** を使って再現する。

### 5-1. フォルダと画面
フォルダ構成が本番URLの形（`/機能/段階/`）を踏襲。各画面に本番の**画面ID**を併記。
```
cart/
├── assets/
│   ├── cart-common.css   本番 /resources/css の写し（レイアウト基盤・原則不変更）
│   ├── theme.css         本番 getCss の写し（色・ボタン＝見た目の中心）
│   └── cart-app.js       挙動（window.TX / localStorage）
├── cart/index.html                 ショッピングカート（CBY0001D01）
├── member/regist/
│   ├── input/index.html            会員登録 入力（MEM0001D01）
│   ├── confirm/index.html          会員登録 確認（MEM0001D02）
│   └── complete/index.html         会員登録 完了（MEM0001D03）
└── mypage/
    ├── login/index.html            ログイン（MYP0001D01）
    └── index.html                  マイページ本体（MYP0002D01）
```

### 5-2. 状態の保存（localStorage / sessionStorage）
本番はカート・会員・注文をサーバーDBで持つ。ローカルはDBが無いので**ブラウザの保存領域**で代替する。
永続してほしいもの（カート・会員・注文履歴）は **localStorage**、その場限りのもの（登録の入力→確認の受け渡し）は **sessionStorage**。
値はJSON文字列で保存し、読み書き時に `JSON.parse` / `JSON.stringify` する。使うキーは cart-app.js 15〜19行：

| キー | ストア | 内容 | 形 |
|---|---|---|---|
| `hokudai_cart` | localStorage | カート内商品 | `[{itemId, name, price, qty, imageUrl, itemCode}]` |
| `hokudai_member` | localStorage | 登録会員（デモ1件） | `{memberId, password, name, …}` |
| `hokudai_session` | localStorage | ログイン中の会員ID | `"会員ID"`（文字列） |
| `hokudai_orders` | localStorage | 注文履歴（新しい順） | `[{no, date, items[], itemTotal, ship, total, status}]` |
| `hokudai_regist_tmp` | **sessionStorage** | 登録 入力→確認 の一時保持 | フォーム値 |

> 確認・初期化：DevTools → Application → Local/Session Storage（`http://localhost:3000`）で閲覧。リセットは `localStorage.clear()`。

### 5-3. 取引API `TX`（cart-app.js）
`cart-app.js` を読み込むと `window.TX` が用意される。`TX` は **Transaction（取引）** の略で、§1の `Shop` の取引版。
役割分担は **`Shop`＝見せる側（トップ・一覧・詳細）／`TX`＝売る側（カート・会員・注文）**。実データの読み書きは §5-2 に対して `TX` が行う。
各ページの `<script>` は `TX.〇〇()` を呼ぶだけで処理できる。行＝cart-app.js の行番号。

| 分類 | メンバー | 内容 |
|---|---|---|
| カート | `TX.addToCart(item)` | 追加（同一`itemId`は数量加算）(58) |
| | `TX.updateQty(id, qty)` | 数量変更（最小1）(73) |
| | `TX.removeItem(id)` / `TX.clearCart()` | 削除 / 全消去 (81,86) |
| | `TX.getCart()` / `TX.cartCount()` | 取得 / 合計点数 (53,55) |
| | `TX.cartTotals(pref?, size?)` | `{itemTotal, ship, total}` を計算。`pref`未指定なら `ship=null`（未確定）・合計は送料別 |
| 送料 | `TX.shipFeeFor(pref, size)` | 配送先(都道府県)×サイズ区分の地域別送料を引く（不明は`null`）§5-4 |
| | `TX.SHIP_REGIONS` | 地域別送料テーブル（12地域×3サイズ） |
| 会員 | `TX.saveMember(m)` / `TX.getMember()` | 会員の保存 / 取得 (95,96) |
| | `TX.login(id, pw)` / `TX.logout()` | ログイン / ログアウト (103,111) |
| | `TX.isLoggedIn()` / `TX.currentMember()` | ログイン状態 / 現在の会員 (97,98) |
| 登録一時 | `TX.setRegTmp` / `getRegTmp` / `clearRegTmp` | 入力→確認の受け渡し（sessionStorage）(114-116) |
| 注文 | `TX.createOrder()` | カートから注文生成→履歴先頭に追加→カート消去 (120) |
| | `TX.getOrders()` | 注文履歴取得 (119) |
| UI | `TX.updateHeaderCount()` | `[data-cart-count]` にカート点数を反映 (138) |
| 定数 | `TX.PREFECTURES` | 都道府県47（住所セレクト用）(147) |

### 5-4. 送料の決まり方
本番の送料は**配送先の地域 × 荷物のサイズ区分**で決まり、送料無料の閾値は無い。金額は注文時点では未確定（配送先・サイズ確定後に決まる）。
ローカルもこれに合わせ、カートでは送料を計算せず「合計（送料別）」＝商品合計のみを表示する。

| 項目 | 内容 |
|---|---|
| 送料 | 地域 × サイズ区分（60-80 / 100-120 / 140-160）。実額は `cart-app.js` の `SHIP_REGIONS`（12地域）に収録。出典 <https://hokudai-goods-seikyou.net/fee> |
| 送料無料 | 無し（閾値なし） |
| カート時点 | 送料は**未確定**表示。合計は「送料別」（商品合計のみ）。本番も「注文時は未決定」 |
| 試算 | `TX.cartTotals(pref)` / `TX.shipFeeFor(pref, size)` に都道府県を渡すと地域送料を計算できる |
| 受注番号 | `YYYYMMDD-{時分秒を秒換算した5桁}`（`orderNo`） |
| 注文ステータス | 生成時 `"ご注文受付"` 固定 |

### 5-5. 一連フロー
```
【購入】商品詳細「カートに入れる」→ TX.addToCart → hokudai_cart
      → カート（cart/cart/）で 数量変更・削除、TX.cartTotals で金額表示（送料別）→「レジに進む」
      → TX.createOrder：hokudai_orders 先頭へ追加＋カート消去
      → マイページ（cart/mypage/）で TX.getOrders を注文履歴として表示
【会員】登録 input →(setRegTmp)→ confirm →(saveMember)→ complete
       ログイン：TX.login(id,pw) 成功で hokudai_session に会員IDを保存
```
各画面の詳細は [../cart/README.md](../cart/README.md)。

---

## 6. ファイル・フォルダ早見表

| パス | 役割 | 本番原本（original/）の対応 |
|---|---|---|
| `index.html` | トップ（骨組み＋差し込み呼び出し） | `Toppage.html` |
| `product-list.html` | 商品一覧（絞込/並べ替え） | `Product_List.html` |
| `product-details.html` | 商品詳細（`info1`表示＋カート投入） | `Product_Details.html` |
| `search.html` | 検索結果 | `Product_Search.html` |
| `404.html` | 404 | `404_Not_Found.html` |
| `js/shop.js` | 商品描画（`Shop`） | サーバーSSR（`{% for item %}`） |
| `data/products.json` | 商品175件 | 商品DB |
| `data/news.json` | お知らせ一覧（`{no,date,title}`）→ `fr/{no}.html` | `freepageList` |
| `data/main-visual.html` / `top-message1.html` / `top-message2.html` | トップ差し込み部品 | `dsnTopHtmlTag` / `dsnTopDesc1/2Shop` |
| `css/`（5ファイル） | ストアフロントCSS | `original/css/`（本番 `cssAddr`） |
| `fr/{n}.html` / `fr/_template.html` | お知らせ本体 / 雛形 | フリーページ `/fr/{no}` |
| `lp/lp-〇〇/` | LP（1LP=1フォルダ） | `Landing_Page.html` |
| `cart/` | カート・会員・マイページ（再現＋`TX`） | `cart.raku-uru.jp` |
| `original/` | 本番テンプレ原本（**変更禁止・分析専用**） | ― |

---

## 7. 本番との違い（前提と制約）

| 観点 | ローカル | 本番との違い |
|---|---|---|
| 描画 | ブラウザJSが起動後に組み立て | 本番はサーバーが完成HTMLを返す。ローカルは**初回に一瞬空→描画**の動きが出る |
| ヘッダー/フッター | 各HTMLに直書きコピー | 本番は `Common_Part.html` 1か所。ローカルは**全ページ横断修正**が必要 |
| 決済・会員・在庫 | localStorage による疑似挙動 | **実決済・本登録・在庫連携なし**（プレビュー専用） |
| 画像 | 本番CDN（`image.raku-uru.jp`）を直参照 | ネット接続前提（LPは自前画像も可） |
| URL | 拡張子なしクエリ（§4） | 本番は `/item-list` 等のルーティング |
| 表示件数 | `slice()` の数字で固定 | 本番は管理画面のデザイン設定 |

各ページ先頭の `<!-- 本番ルート: … -->` コメントが、その画面の本番URL・画面IDへの道しるべ。
本番へ戻す機械変換は **`build-production` スキル**（[../.claude/skills/build-production/SKILL.md](../.claude/skills/build-production/SKILL.md)）。

---

## 参考
- 起動・使い方 … [../README.md](../README.md)
- 操作手順 … [HOWTO.md](HOWTO.md)
- 本番プラットフォーム仕様 … [RAKUURU-SPEC.md](RAKUURU-SPEC.md)
- 本番構造の図解 … [ARCHITECTURE.md](ARCHITECTURE.md)
- 取引ページ詳細 … [../cart/README.md](../cart/README.md)
