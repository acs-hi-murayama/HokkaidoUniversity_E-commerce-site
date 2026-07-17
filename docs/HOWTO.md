# 詳細操作マニュアル（HOWTO）

「どこに何があって、どこを変えれば何が変わるか」を、実際のコード例つきで手順化したものです。
概要は [../README.md](../README.md)、本番構造は [../ARCHITECTURE.md](ARCHITECTURE.md)、らくうるカートの仕様は [RAKUURU-SPEC.md](RAKUURU-SPEC.md)、ローカル実装の仕様は [LOCAL-SPEC.md](LOCAL-SPEC.md) を参照。

> 前提：開発サーバーを起動しておく → `npx.cmd serve . -l 3000` → <http://localhost:3000/>
> 変更後は **Ctrl+Shift+R**（強制リロード）で反映を確認。

---

## 0. 全体構造マップ ― どのファイルが画面の何を描くか

トップページ `index.html` は「枠」だけを持ち、**中身は別ファイルをJavaScriptで流し込む**構造です
（本番らくうるカートがサーバーで `{{ 変数 }}` を差し込むのと同じ考え方）。

```
ブラウザで index.html を開く
        │
        ├─ #js-main-visual   ← data/main-visual.html      … メインビジュアル(大バナー)
        ├─ #js-top-message1  ← data/top-message1.html     … 挨拶文 + LPバナースライダー
        ├─ NEWS の <dl>       … index.html に直書き          … お知らせ一覧
        ├─ #js-new           ← js/shop.js → data/products.json … 新着商品3件
        ├─ #js-recommend     ← js/shop.js → data/products.json … おすすめ商品6件
        └─ #js-top-message2  ← data/top-message2.html     … ご利用案内など
```

| 変えたいもの | 触るファイル |
|---|---|
| お知らせ | `fr/N.html`（本体）＋ `index.html` のNEWSリスト |
| LP（特設ページ） | `lp/【LP名】/`（本体＋バナー）＋ `data/top-message1.html`（導線） |
| トップの大バナー | `data/main-visual.html` |
| トップの挨拶文・LPスライダー | `data/top-message1.html` |
| トップ下部の案内文 | `data/top-message2.html` |
| トップの商品表示件数 | `index.html` の `<script>`（`slice()` の数字） |
| 商品データ | `data/products.json` |
| カテゴリー | `js/shop.js` の `CATEGORIES` ＋ 各ページのカテゴリーリンク |
| カート/マイページ/会員登録の**色・レイアウト** | `cart/assets/theme.css` |
| カート/マイページ/会員登録の**文言・項目** | `cart/【機能】/index.html` |

---

## 1. お知らせを追加する

**使うファイル**：`fr/_template.html`（雛形）／ 新規 `fr/N.html`（本体）／ `data/news.json`（一覧データ）

### 手順
1. **雛形をコピー**して次の番号のファイルを作る。Nには数字を入力してください。例：`fr/4.html`。
   ```bash
   cp fr/_template.html fr/4.html
   ```
2. `fr/4.html` を開き、**3つのプレースホルダ**を置換する（雛形の該当行）。

   | プレースホルダ | 場所（fr/_template.html） | 例 |
   |---|---|---|
   | `__PAGE_TITLE__` | title(9行) / meta(10行) / パンくず(77行) / 見出し(85行) | `夏季休業のお知らせ` |
   | `__PAGE_DATE__` | 見出しの日付(85行) | `2026.07.20` |
   | `__PAGE_BODY__` | 本文(89行) | `<p>…本文…</p>` |

   本文の書き方（89行目付近）：
   ```html
   <!-- 変更前 -->
   <div class="freepage-body wysiwyg-data">
       __PAGE_BODY__
   </div>
   <!-- 変更後 -->
   <div class="freepage-body wysiwyg-data">
       <p>誠に勝手ながら、8月11日〜8月15日を夏季休業とさせていただきます。</p>
       <p>期間中のご注文は8月16日以降の発送となります。</p>
   </div>
   ```
3. **一覧データに1件追加する**。[../data/news.json](../data/news.json) に要素を1つ足すだけ（`index.html` は触らない）。
   `no` は本体ファイル名（`fr/{no}.html`）に対応。
   ```jsonc
   [
     { "no": 4, "date": "2026.07.20", "title": "夏季休業のお知らせ" },  // ← 追記
     { "no": 1, "date": "2026.06.20", "title": "堀内、パチンコ辞める。" },
     { "no": 2, "date": "2026.06.10", "title": "堀内、タバコ辞める。" },
     { "no": 3, "date": "2026.05.25", "title": "堀内、寝不足。" }
   ]
   ```
   > 並び順は気にしなくてよい（`date` の**新しい順に自動ソート**して表示される）。
   > **BOMなしUTF-8**で保存すること（JSONが壊れるため）。
4. **確認**：<http://localhost:3000/> のお知らせ欄に**新しい順で最新N件**が出る → クリックで `fr/4.html` が開く。

> 💡 **仕組み**：トップのお知らせは `data/news.json` を [../js/shop.js](../js/shop.js) の `Shop.renderNews()` が読み込み、
> 新しい順に最新N件だけ描画する（本番らくうるカートの `{% for item in freepageList %}` と同型）。
> **表示件数**は [../index.html](../index.html) の `Shop.renderNews("#js-news", 5)` の数字で変更（省略すると全件）。
> `data/news.json` = 本番の `freepageList`、`fr/{no}.html` = `/fr/{freepageSerialNo}` に対応する。

---

## 2. LP（ランディングページ／特設ページ）を追加する

**使うファイル**：新規 `lp/【LP名】/index.html` ＋ バナー画像 ／ `data/top-message1.html`（トップからの導線）

### 手順
1. **フォルダを作る**（1 LP = 1 フォルダ）。例：`lp/lp-summer/`
   ```bash
   mkdir lp/lp-summer
   ```
2. **本体HTMLを置く**。手軽なのは既存LPの複製：
   ```bash
   cp lp/lp-bear/index.html lp/lp-summer/index.html
   ```
   開いてタイトル・本文・画像を書き換える。
   **注意（重要）**：LPはサイトルートから2階層深いので、共通CSSの参照は `../../css/...` になる
   （`lp/lp-summer/index.html` 内では `<link href="../../css/common.css">`）。
3. **バナー画像を同じフォルダに置く**（例：`lp/lp-summer/banner.png`）。
4. **トップのLPスライダーに1枚追加**して導線を作る。
   [../data/top-message1.html](../data/top-message1.html) の `<div class="full-screen slider">` の中（12〜23行）へ
   `<div>…</div>` を1つ追記する。
   ```html
   <!-- data/top-message1.html のスライダー内に追記 -->
   <div>
     <a href="./lp/lp-summer/"><img src="./lp/lp-summer/banner.png" alt="夏の北大グッズフェア" /></a>
   </div>
   ```
   > ⚠ **リンクは必ず末尾スラッシュ付き** `./lp/lp-summer/`。スラッシュ無しだとLP内の相対参照
   > （`./banner.png` 等）が親フォルダ基準で解決され、画像が壊れます（開発サーバーのクリーンURL挙動）。
5. **確認**：トップのスライダーに新バナーが流れる → クリックで `/lp/lp-summer/` が開く。

詳細・注意点（サンリオLPのランタイム依存など）は [../lp/README.md](../lp/README.md)。

---

## 3. トップページの見た目を変える

トップは `index.html` に直書きせず、**役割ごとの別ファイルを差し込む**方式です。変えたい部分のファイルだけ編集します。

### 3-1. メインビジュアル（一番上の大バナー）
**ファイル**：[../data/main-visual.html](../data/main-visual.html)（本番の `dsnTopHtmlTag` 相当）
- バナー画像とリンク先を差し替える。例：
  ```html
  <div class="top-main-visual" style="margin-bottom:28px;">
    <a href="./lp/lp-sanrio/">
      <img src="./lp/lp-sanrio/sanrio_banner.png" alt="…" style="width:100%;height:auto;display:block;" />
    </a>
  </div>
  ```
- **確認**：トップ最上部の大バナーが変わる。

### 3-2. 挨拶文 ＋ LPバナースライダー
**ファイル**：[../data/top-message1.html](../data/top-message1.html)（本番の `dsnTopDesc1Shop` 相当）
- 挨拶文＝3〜9行の `<h2>` と `<div id="top-massage-bottom">`。
- LPスライダー＝12〜24行（→ 追加方法は「手順2-4」）。
- **確認**：トップの挨拶文／スライダーが変わる。

### 3-3. 下部の案内文（ご利用案内など）
**ファイル**：[../data/top-message2.html](../data/top-message2.html)（本番の `dsnTopDesc2Shop` 相当）
- ご利用案内・支払い方法・酒類販売管理者標識などのHTMLを編集。
- **確認**：トップ最下部（フッター上）の案内が変わる。

### 3-4. 商品セクションの表示件数
**ファイル**：[../index.html](../index.html) の `<script>`（216〜224行）
- 数字を変えるだけ。
  ```js
  Shop.fill("#js-new",       news.slice(0, 3).map(Shop.card).join(""));      // 新着 3件 → 変更可
  Shop.fill("#js-recommend", pub.slice(0, 6).map(Shop.rankCard).join(""));   // おすすめ 6件 → 変更可
  // 販売ランキングを出したい場合は次行のコメントを外す：
  // Shop.fill("#js-ranking", pub.slice(0, 12).map(Shop.rankCard).join(""));
  ```
- **確認**：トップの各商品行の件数が変わる。

### 3-5. 商品そのもの・カテゴリー
- 商品データ＝[../data/products.json](../data/products.json)（追加/編集の詳細は [../README.md](../README.md) 3-1）。
- カテゴリーID↔名称＝[../js/shop.js](../js/shop.js) の `CATEGORIES`。ナビのリンクは各ページの
  `?categoryId=CG-000xx` を編集。

---

## 4. カート・マイページ・会員登録の見た目を変える

これらは本番（`cart.raku-uru.jp`）の見た目を忠実再現したページ群で、`cart/` 配下にあります。
**「色・レイアウト」と「文言・項目」で編集ファイルが分かれます。**

### 対象ファイルの地図
```
cart/
├── assets/
│   ├── theme.css        ★色・フォント・ボタン色（店舗テーマ）… 見た目の中心
│   ├── cart-common.css   レイアウト基盤（本番 /resources/css の写し。原則触らない）
│   └── cart-app.js       挙動（localStorageでの疑似カート/会員/注文）
├── cart/index.html               … ショッピングカート
├── member/regist/
│   ├── input/index.html          … 会員登録 入力
│   ├── confirm/index.html        … 会員登録 確認
│   └── complete/index.html       … 会員登録 完了
└── mypage/
    ├── login/index.html          … マイページ ログイン
    └── index.html                … マイページ本体
```

### 4-1. 色・ボタン・フォントを変える（全取引ページ共通）
**ファイル**：[../cart/assets/theme.css](../cart/assets/theme.css)
主要な色は上部に集約されています。

| 変えたいもの | theme.css の場所 | 現在値 |
|---|---|---|
| リンク文字色 | `a { color:… }`（46行付近） | `#044389` |
| ボタン背景色 | `.btn { background-color:… }`（68〜71行付近） | `#0f4c5c` |
| ヘッダー/フッター/ステップ帯 | `#e9bc00` を検索（複数箇所） | `#e9bc00`（黄） |

例：ボタンを緑にする
```css
/* cart/assets/theme.css */
.btn { color:#fff; background-color:#1a7a57; }   /* #0f4c5c → #1a7a57 */
```
- **確認**：<http://localhost:3000/cart/mypage/login/> のログインボタン色などが変わる。
- ⚠ `theme.css` は本番の `getCss`（テーマ）を写したもの。色変更はここで完結する。
  `cart-common.css` はレイアウト基盤なので原則さわらない。

### 4-2. 文言・入力項目を変える（各ページ個別）
**ファイル**：`cart/【機能】/index.html`（上の地図参照）

- 例：ログイン画面の案内文を変える → [../cart/mypage/login/index.html](../cart/mypage/login/index.html) の
  ```html
  <div class="cart-mypage-login-msg">
    <p>会員の方はIDとパスワードを入力してログインしてください。</p>  <!-- ここを編集 -->
  </div>
  ```
- 例：会員登録の入力項目を増減する → [../cart/member/regist/input/index.html](../cart/member/regist/input/index.html) の
  `<table>` 内の `<tr class="cart-input-…">` ブロックを追加/削除。
  必須マークは `<th class="cart-input-require">` を付ける（本番と同じ `＊必須` が付く）。
- **確認**：該当ページを開いて表示・入力を確認。会員登録は 入力→確認→完了 まで通す。

### 4-3. 挙動（入力→確認や、カート計算）を変える
**ファイル**：[../cart/assets/cart-app.js](../cart/assets/cart-app.js)
- 送料（地域別テーブル `SHIP_REGIONS`・`shipFeeFor()`／全国一律ではない・送料無料なし）、localStorageキー、バリデーション等はここ。
- 一連フロー（商品追加→カート→レジ→注文履歴）の全体像は [../cart/README.md](../cart/README.md)。

> 💡 本番へ移行するときは、`theme.css` は `getCss` に、HTML項目はそのまま、`cart-app.js` はサーバー処理に
> 置き換わります（[../ARCHITECTURE.md](ARCHITECTURE.md) と `build-production` スキル参照）。

---

## 付録：よく使うURL（サーバー起動後）
| ページ | URL |
|---|---|
| トップ | <http://localhost:3000/> |
| 商品一覧（酒類で絞込） | <http://localhost:3000/product-list?categoryId=CG-00002> |
| お知らせ | <http://localhost:3000/fr/1.html> |
| LP（サンリオ） | <http://localhost:3000/lp/lp-sanrio/> |
| 会員登録 | <http://localhost:3000/cart/member/regist/input/> |
| ログイン | <http://localhost:3000/cart/mypage/login/> |
| カート | <http://localhost:3000/cart/cart/> |
