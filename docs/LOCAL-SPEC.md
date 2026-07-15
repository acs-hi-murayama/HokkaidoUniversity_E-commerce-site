# ローカル再現サイト 仕様書（実装詳解）

このローカル環境が **どう作られていて、どのファイル／関数／データが何を担っているか** を、
実装の実物（`js/shop.js`・`cart/assets/cart-app.js`・`data/products.json` など）に基づいて
解像度高く解説します。行番号は各実ファイルのものです。

- 概要・起動 … [../README.md](../README.md)
- 操作手順（何を変えると何が変わる） … [HOWTO.md](HOWTO.md)
- **本書** … ローカル実装の**技術仕様**（描画エンジン・データモデル・localStorage・URL規約）
- 対になる本番仕様 … [RAKUURU-SPEC.md](RAKUURU-SPEC.md)（らくうるカート側の仕様）

---

## 0. これは何か（技術スタックと方針）

| 項目 | 内容 |
|---|---|
| 種別 | **静的サイト**（サーバー言語・DB・ビルド無し）。ブラウザのJavaScriptだけで動く |
| 配信 | `npx.cmd serve . -l 3000`（Node製の静的サーバー `serve`） |
| 依存 | jQuery 1.12.4（CDN）＋ slick-carousel（CDN・トップのスライダー）のみ。フレームワーク無し |
| 自作JS | `js/shop.js`（商品描画）／`cart/assets/cart-app.js`（取引挙動） |
| データ | `data/products.json`（商品175件）＋ `data/*.html`（差し込み用HTML断片） |
| 状態保存 | ブラウザの **localStorage / sessionStorage**（カート・会員・注文） |

**設計方針**：本番らくうるカートが**サーバーでやっていること**を、**ブラウザ側のJSと静的データで代替**する。
本番の外枠（HTML構造・クラス名・URLパス）はできる限り保ち、動的処理層だけを差し替え可能にしている。

```
本番: ブラウザ ← 完成HTML ← サーバー(Twig SSR + DB)
ローカル: ブラウザ ← 静的HTML + JSが実行時にJSON/HTML断片を fetch して描画
```

---

## 1. 描画エンジン `js/shop.js`（ローカルの心臓部）

`window.Shop` という名前空間で、商品の読み込み・整形・描画・差し込みを提供します。
各ページの `<script>` はこの `Shop.*` を呼ぶだけです。

### 1-1. 全体の流れ
```
ページ読込
  └─ Shop.load()               data/products.json を fetch（結果は _cache に1回だけ保持）
        └─ Shop.published(all) published==="1" かつ active==="1" だけに絞る
              └─ フィルタ/並び替え（categoryId, sortKind, searchWord …）
                    └─ Shop.fill("#js-...", 配列.map(Shop.card).join(""))  DOMへ描画
```

### 1-2. `Shop` API リファレンス（js/shop.js）
| メンバー | 行 | シグネチャ / 意味 |
|---|---|---|
| `Shop.load()` | 37 | `Promise<商品配列>`。`products.json` を取得。2回目以降はキャッシュ即返し |
| `Shop.published(list)` | 58 | 公開商品だけに絞る（`published==="1" && active==="1"`） |
| `Shop.byId(list, id)` | 60 | `itemId` 一致の1件を返す（詳細ページ用） |
| `Shop.param(name)` | 67 | URLクエリを取得（`?id=` 等）。`URLSearchParams` の薄いラッパ |
| `Shop.card(p)` | 73 | 通常の商品カードHTML（一覧・新着・検索） |
| `Shop.rankCard(p, i)` | 87 | 順位バッジ付きカードHTML（`i`は0始まり→`rank{i+1}`） |
| `Shop.fill(sel, html)` | 101 | `sel` の要素の `innerHTML` を置換 |
| `Shop.include(sel, url)` | 109 | 外部HTML断片を fetch して `sel` に注入（`Promise`）。**本番の `dsnTopDesc` 注入に相当** |
| `Shop.yen(n)` | 47 | `729` → `¥729`（`toLocaleString("ja-JP")`） |
| `Shop.esc(s)` | 49 | HTMLエスケープ（`&<>"`） |
| `Shop.detailUrl(p)` | 55 | `./product-details?id={itemId}`（**拡張子なし**。§4参照） |
| `Shop.categories` | 18 | `categoryId → 表示名` のマスター（12件） |
| `Shop.categoryName(id)` | 33 | ID→表示名（無ければ `null`） |

> `card()` と `rankCard()` の差は**順位バッジの有無**だけ（rankは `.icon-rank rank{n}` を先頭に付ける）。
> 生成するHTMLは本番の `.list-product li`（商品カード）と同一クラス構造。

### 1-3. カテゴリーマスター（js/shop.js 18-31）
本番はカテゴリーもサーバー供給だが、ローカルは**この定数**と `products.json` の `categoryId` を突き合わせる。

| categoryId | 表示名 | categoryId | 表示名 |
|---|---|---|---|
| CG-00004 | ウェア | CG-00016 | 革製品グッズ |
| CG-00001 | 食品 | CG-00018 | ガラスジュエリー |
| CG-00002 | 酒類 | CG-00015 | 寮歌CD |
| CG-00003 | 文具 | CG-00008 | その他 |
| CG-00019 | 小物 | CG-00007 | おしょろ丸グッズ |
| CG-00017 | 生活雑貨 | CG-00014 | ミズナラグッズ |

---

## 2. 商品データモデル `data/products.json`

配列に商品オブジェクトが**175件**。1件の実データ（先頭商品）：

```jsonc
{
  "itemId": "01-14604-T000000016-001",   // システム商品番号（詳細ページ ?id= と一致させる主キー）
  "name": "北海道ミルククッキー札幌農学校 12枚入り",
  "price": 729,                           // 数値（円・税込）
  "tax": "内税",                          // 税区分表示
  "itemCode": "",                         // 店舗商品コード（任意）
  "jan": "",                              // JANコード（任意）
  "categoryId": "CG-00001",               // カテゴリー（§1-3のマスターと対応）
  "campaignId": "",                       // キャンペーン（任意）
  "imageUrl": "https://image.raku-uru.jp/...jpg",   // メイン画像（本番CDNを直参照）
  "otherImages": ["https://image.raku-uru.jp/...", "..."],  // サブ画像
  "info1": "<style>…</style><section>…商品説明HTML…</section>",  // 詳細ページ本文（HTML）
  "isNew": "0",                           // "1"=新着（トップ新着の抽出に使用）
  "published": "1",                       // "1"=公開
  "active": "1"                           // "1"=有効
}
```

| フィールド | 型 | 用途 | 備考 |
|---|---|---|---|
| `itemId` | string | **主キー**。詳細URL `?id=` と照合 | 長い複合ID形式 |
| `name` | string | 商品名 | カード・詳細・alt |
| `price` | number | 税込価格 | `Shop.yen()` で整形 |
| `tax` | string | 税区分 | 例 `内税` |
| `categoryId` | string | 分類 | 一覧の絞り込みキー |
| `imageUrl` / `otherImages` | string / string[] | 画像 | 本番の画像CDNをそのまま参照 |
| `info1` | string(HTML) | 詳細ページ本文 | `<style>`含む完成HTML |
| `isNew` | "0"/"1" | 新着判定 | トップ新着で使用 |
| `published` / `active` | "0"/"1" | 公開/有効 | 両方"1"で表示（`Shop.published`） |

> **保存の注意**：`products.json` は **BOMなしUTF-8**。フラグ類は**文字列 `"1"`**（数値1ではない）。
> 生成元は本番の商品CSV。編集の手順は [HOWTO.md](HOWTO.md) と [../README.md](../README.md) 3-1。

---

## 3. トップの差し込み機構（`Shop.include`）

トップ `index.html` は骨組みだけを持ち、中身を**別ファイルからJSで注入**します
（本番が `{{ dsnTopDesc1Shop }}` 等をSSRで差し込むのと同じ役割）。

| index.html の要素 | 注入元ファイル | 本番の対応変数 |
|---|---|---|
| `#js-main-visual` | `data/main-visual.html` | `dsnTopHtmlTag`（キービジュアル） |
| `#js-top-message1` | `data/top-message1.html` | `dsnTopDesc1Shop`（挨拶＋LPスライダー） |
| `#js-top-message2` | `data/top-message2.html` | `dsnTopDesc2Shop`（下部案内） |
| `#js-new` | `products.json`（`isNew`で抽出） | `itemRecentList` |
| `#js-recommend` | `products.json` | `itemRecommendList` |
| NEWS `<dl>` | index.html に直書き | `freepageList`（本番は自動） |

**index.html の描画スクリプト（実物・208-224行付近）**
```js
Shop.load().then(function (all) {
  var pub  = Shop.published(all);
  var news = pub.filter(function (p) { return p.isNew === "1"; });
  if (news.length < 3) news = pub;                       // 新着が3件未満なら公開商品で補完
  Shop.fill("#js-new",       news.slice(0, 3).map(Shop.card).join(""));      // 新着 3件
  Shop.fill("#js-recommend", pub.slice(0, 6).map(Shop.rankCard).join(""));   // おすすめ 6件
  // Shop.fill("#js-ranking", pub.slice(0,12).map(Shop.rankCard).join(""));  // 販売ランキング（本番非表示のため休止）
});
Shop.include("#js-main-visual", "./data/main-visual.html");
Shop.include("#js-top-message2", "./data/top-message2.html");
Shop.include("#js-top-message1", "./data/top-message1.html").then(function () {
  if (window.jQuery && $.fn.slick) { $(".full-screen").slick({ … }); }        // 注入後にスライダー初期化
});
```
> `top-message1` は**注入完了後に** slick を初期化する（先に初期化するとバナーが空になるため `.then()` 内で実行）。

---

## 4. URL 規約（重要：`serve` 対策の拡張子なしリンク）

ローカル固有の最重要ルールです。

- **クエリ付きの内部リンクは拡張子（`.html`）を付けない**。
  例：`product-list?categoryId=CG-00002`、`product-details?id=...`、`search?searchWord=...`
- **理由**：`serve` は既定（cleanUrls）で `page.html?x=1` を `/page` へ **301リダイレクトし、その際クエリを落とす**。
  拡張子なしで書けばリダイレクトが起きず、クエリが保持される。

| 論理ページ | ローカルURL | 実ファイル | 主なクエリ |
|---|---|---|---|
| トップ | `/` | `index.html` | ― |
| 商品一覧 | `/product-list?categoryId=&sortKind=` | `product-list.html` | `categoryId`, `sortKind`(1低/2高) |
| 商品詳細 | `/product-details?id=` | `product-details.html` | `id`(=itemId) |
| 検索 | `/search?searchWord=` | `search.html` | `searchWord` |
| お知らせ | `/fr/{n}.html` | `fr/{n}.html` | ― |
| LP | `/lp/lp-〇〇/` | `lp/lp-〇〇/index.html` | ―（末尾スラッシュ必須） |
| 404 | 存在しないパス | `404.html` | ― |

> **本番との命名差**：本番は `/item-list`・`/item-detail/{id}`。移行時は本番名へ戻す（`build-production`スキルが変換）。

### ページ別の描画ロジック
| ページ | 実装（該当スクリプト） |
|---|---|
| **一覧** `product-list.html` | 公開品→`categoryId`で絞込→カテゴリ名でタイトル/パンくず/リード更新→`sortKind`で価格ソート→`#js-list`へ描画→件数表示（176-203行） |
| **詳細** `product-details.html` | `Shop.param("id")`→`Shop.byId`で1件特定→名前/価格/画像/`info1`を差し込み→「カートに入れる」で `TX.addToCart` |
| **検索** `search.html` | `searchWord` を `name` に対して部分一致フィルタ→`Shop.card`で描画 |

**一覧の絞り込み（product-list.html 176-203の要点）**
```js
var list = Shop.published(all);
var cat  = Shop.param("categoryId");
if (cat) {
  list = list.filter(function (p) { return p.categoryId === cat; });   // カテゴリ絞込
  // → カテゴリ名でタイトル/パンくず(#js-crumb)/見出し(#js-cat-title)/リード(#js-cat-lead)を更新
  // → 並び替えリンクに &categoryId= を付与して条件を維持
}
var sort = Shop.param("sortKind");
if (sort === "1") list.sort((a,b)=>a.price-b.price);   // 価格の低い順
else if (sort === "2") list.sort((a,b)=>b.price-a.price); // 価格の高い順
Shop.fill("#js-list", list.map(Shop.card).join(""));
```

---

## 5. 取引レイヤー `cart/`（会員・カート・注文）

`cart/` 配下は本番 `cart.raku-uru.jp` の見た目を忠実再現したページ群で、
挙動は `cart/assets/cart-app.js` の `window.TX` API が **localStorage** で再現します。

### 5-1. フォルダと画面
```
cart/
├── assets/
│   ├── cart-common.css   本番 /resources/css の写し（レイアウト基盤・原則不変更）
│   ├── theme.css         本番 getCss の写し（色・ボタン。見た目の中心）
│   └── cart-app.js       挙動（window.TX / localStorage）
├── cart/index.html                 ショッピングカート（本番ID CBY0001D01）
├── member/regist/
│   ├── input/index.html            会員登録 入力（MEM0001D01）
│   ├── confirm/index.html          会員登録 確認（MEM0001D02）
│   └── complete/index.html         会員登録 完了（MEM0001D03）
└── mypage/
    ├── login/index.html            ログイン（MYP0001D01）
    └── index.html                  マイページ本体（MYP0002D01）
```

### 5-2. localStorage / sessionStorage スキーマ（cart-app.js 15-19）
| キー | ストア | 内容 | 形 |
|---|---|---|---|
| `hokudai_cart` | localStorage | カート内商品 | `[{itemId,name,price,qty,imageUrl,itemCode}]` |
| `hokudai_member` | localStorage | 登録済み会員（デモ1件） | `{memberId,password,name,…}` |
| `hokudai_session` | localStorage | ログイン中の会員ID | `"会員ID"` 文字列 |
| `hokudai_orders` | localStorage | 注文履歴 | `[{no,date,items[],itemTotal,ship,total,status}]` |
| `hokudai_regist_tmp` | **sessionStorage** | 登録の入力→確認の一時保持 | 入力フォーム内容 |

### 5-3. `TX` API リファレンス（cart-app.js）
| 分類 | メンバー | 意味 |
|---|---|---|
| カート | `TX.addToCart(item)` | 追加（同一`itemId`は数量加算）(58) |
| | `TX.updateQty(id, qty)` | 数量変更（最小1）(73) |
| | `TX.removeItem(id)` / `TX.clearCart()` | 削除 / 全消去 (81,86) |
| | `TX.getCart()` / `TX.cartCount()` | 取得 / 合計点数 (53,55) |
| | `TX.cartTotals()` | `{itemTotal, ship, total, freeThreshold}` を計算 (87) |
| 会員 | `TX.saveMember(m)` / `TX.getMember()` | 会員の保存 / 取得 (95,96) |
| | `TX.login(id, pw)` / `TX.logout()` | ログイン / ログアウト (103,111) |
| | `TX.isLoggedIn()` / `TX.currentMember()` | ログイン状態 / 現在の会員 (97,98) |
| 登録一時 | `TX.setRegTmp/getRegTmp/clearRegTmp` | 入力→確認の受け渡し（sessionStorage）(114-116) |
| 注文 | `TX.createOrder()` | カートから注文生成→履歴先頭に追加→カート消去 (120) |
| | `TX.getOrders()` | 注文履歴取得 (119) |
| UI | `TX.updateHeaderCount()` | `[data-cart-count]` にカート点数を反映 (138) |
| 定数 | `TX.PREFECTURES` | 都道府県47（住所セレクト用）(147) |

### 5-4. 送料・注文番号ルール（cart-app.js）
| ルール | 値 / 実装 | 行 |
|---|---|---|
| 送料 | 全国一律 **¥660** | 21 (`SHIP_FEE`) |
| 送料無料 | 税込 **¥5,500以上** で無料（カート空なら送料0） | 22-23, 90 |
| 受注番号 | `YYYYMMDD-{時分秒を秒換算した5桁}` | 44-50 (`orderNo`) |
| 注文ステータス | 生成時 `"ご注文受付"` 固定 | 129 |

### 5-5. 一連フロー
```
商品詳細「カートに入れる」→ TX.addToCart → hokudai_cart
      ↓
カート（cart/cart/）数量変更・削除・TX.cartTotals で合計 → レジへ
      ↓
TX.createOrder：hokudai_orders 先頭に追加 + カート消去
      ↓
マイページ（cart/mypage/）で TX.getOrders を注文履歴として表示

会員登録 input →(TX.setRegTmp)→ confirm →(TX.saveMember)→ complete
ログイン：TX.login(id,pw) → hokudai_session に会員IDを保存
```
詳細は [../cart/README.md](../cart/README.md)。

---

## 6. ファイル・フォルダ仕様一覧

| パス | 役割 | 本番の対応 |
|---|---|---|
| `index.html` | トップ（骨組み＋差し込み呼び出し） | `Toppage.html` |
| `product-list.html` | 商品一覧（絞込/並び替え） | `Product_List.html` |
| `product-details.html` | 商品詳細（`info1`描画＋カート投入） | `Product_Details.html` |
| `search.html` | 検索結果 | `Product_Search.html` |
| `404.html` | 404 | `404_Not_Found.html` |
| `js/shop.js` | 商品描画エンジン（`window.Shop`） | Twig SSR（`{% for item %}`） |
| `data/products.json` | 商品175件 | 商品DB |
| `data/main-visual.html` / `top-message1.html` / `top-message2.html` | トップ差し込みHTML | `dsnTopHtmlTag`/`dsnTopDesc1/2Shop` |
| `css/`（5ファイル） | ストアフロントCSS | `original/css/`・`cssAddr` |
| `fr/{n}.html` / `fr/_template.html` | お知らせ本体 / 雛形 | フリーページ `/fr/{no}` |
| `lp/lp-〇〇/` | LP（1LP=1フォルダ） | `Landing_Page.html` |
| `cart/` | 会員・カート・マイpage（再現＋`TX`） | `cart.raku-uru.jp` |
| `original/` | 本番テンプレ原本（**変更禁止・分析専用**） | ― |

---

## 7. 本番との違い（制約と前提）

| 観点 | ローカルの実装 | 本番との差 |
|---|---|---|
| 描画 | ブラウザJSが実行時に描画 | 本番はサーバーがSSR。**初回に一瞬空→描画**の動きがある |
| ヘッダー/フッター | 各HTMLに直書きコピー | 本番は `Common_Part.html` 1箇所。ローカルは**横断修正が必要** |
| 決済・会員・在庫 | localStorageの疑似挙動 | **実際の決済/登録/在庫連携は無い**（プレビュー専用） |
| 画像 | 本番CDN（`image.raku-uru.jp`）を直参照 | ネット接続が必要 |
| URL | 拡張子なしクエリ（serve対策） | 本番は `/item-list` 等のルーティング |
| 商品件数 | `slice()` の数字で固定 | 本番は管理画面のデザイン設定 |

各ページ冒頭の `<!-- 本番ルート: ... -->` コメントが、その画面の本番URL・画面IDへの道しるべです。
本番へ戻す機械変換は **`build-production` スキル**（[../.claude/skills/build-production/SKILL.md](../.claude/skills/build-production/SKILL.md)）。

---

## 参考
- 起動・使い方 … [../README.md](../README.md)
- 操作手順 … [HOWTO.md](HOWTO.md)
- 本番プラットフォーム仕様 … [RAKUURU-SPEC.md](RAKUURU-SPEC.md)
- 本番構造の図解 … [../ARCHITECTURE.md](ARCHITECTURE.md)
- 取引ページ詳細 … [../cart/README.md](../cart/README.md)
