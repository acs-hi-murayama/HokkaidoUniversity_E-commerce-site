# 北大オリジナルグッズ Online Shop — ローカル再現環境

本番サイト **[hokudai-goods-seikyou.net](https://hokudai-goods-seikyou.net/)**（らくうるカートで構築された北海道大学オフィシャルグッズEC）を、
**ローカルで動く静的プレビュー**として再現したものです。将来的に本番（らくうるカート）へ戻せるよう、
本番の構造・URL・クラス名をできる限り踏襲しています。

- **このページ** … 動かし方・使い方（運用手順）
- **[docs/HOWTO.md](docs/HOWTO.md)** … ★詳細操作マニュアル（お知らせ/LP追加・トップ/カート等の見た目変更を、実コード例つきで手順化）
- **[docs/LOCAL-SPEC.md](docs/LOCAL-SPEC.md)** … ★ローカル再現サイト仕様書（描画エンジン・データモデル・localStorage・URL規約を実装ベースで詳解）
- **[docs/RAKUURU-SPEC.md](docs/RAKUURU-SPEC.md)** … ★らくうるカート仕様書（テンプレート変数・URL体系・データモデルを原本ベースで詳解）
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** … らくうるカート本番環境の構造解説（図つき）
- **[docs/README.md](docs/README.md)** … ドキュメント目次（docs/ 全体の入口）

---

## 1. クイックスタート（起動）

Node.js が入っていれば、追加インストール不要で起動できます。

```powershell
# プロジェクト直下で（PowerShell）
npx.cmd serve . -l 3000
```

ブラウザで **http://localhost:3000/** を開く。

> **なぜ `npx.cmd`？** PowerShell は `.ps1`（`npx`）の実行がポリシーで止められることがあるため、
> `.cmd` 版を使います。`serve` は Node 製の静的サーバーです。

### スマホで確認する
PCとスマホを**同じWi-Fi**につなぎ、PCのローカルIP（例 `192.168.11.1`）へアクセス：
```
http://<PCのIPアドレス>:3000/
```
IPは PowerShell の `ipconfig` で「Wi-Fi」の IPv4 アドレスを確認。初回はWindowsファイアウォールでNode.jsの通信を許可してください。

### よくあるハマりどころ
| 症状 | 原因と対処 |
|------|-----------|
| カテゴリー等で絞り込めない／全件出る | ブラウザに古い301リダイレクトがキャッシュされている。**Ctrl+Shift+R** で強制リロード |
| 再起動したら見られない | `serve` はターミナルを閉じると止まる。再度 `npx.cmd serve . -l 3000` を実行 |
| ページ内リンクの `?id=` 等が効かない | クエリ付きリンクは拡張子なし（`/product-list?...`）で書く決まり（後述） |

---

## 2. フォルダ地図

```
HokkaidoUniversity/
├── README.md                 ← このファイル（入口）
├── docs/                     ← 各種ドキュメント（目次は docs/README.md）
│   ├── README.md             docs目次
│   ├── HOWTO.md              詳細操作マニュアル
│   ├── LOCAL-SPEC.md         ローカル実装 仕様書
│   ├── RAKUURU-SPEC.md       らくうるカート 仕様書
│   ├── ARCHITECTURE.md       本番構造の解説（図つき）
│   ├── MAPPING.md            ローカル ↔ original の対応表
│   └── products_itemid_list.csv  商品ID一覧
│
├── index.html                トップページ
├── product-list.html         商品一覧（?categoryId= / ?sortKind=）
├── product-details.html      商品詳細（?id=）
├── search.html               検索結果（?searchWord=）
├── 404.html                  404ページ
├── members-only-login.html   会員限定ログイン（旧スタブ・cart/ に統合済み）
├── common-id-login.html      共通IDログイン（旧スタブ）
│
├── css/                      ストアフロントのスタイル（本番 original/css/ と同一の5ファイル）
├── js/
│   └── shop.js               データ駆動の商品描画エンジン（★ローカルの心臓部）
├── data/
│   ├── products.json         商品175件（本番CSVから生成）
│   ├── main-visual.html      メインビジュアル（トップに差し込み）
│   ├── top-message1.html     ショップ説明1（LPバナースライダー）
│   └── top-message2.html     ショップ説明2（ご利用案内など）
│
├── fr/                       お知らせ（フリーページ）1.html, 2.html …
├── lp/                       ランディングページ（lp-sanrio / lp-bear / lp-beer）
├── cart/                     会員登録・マイページ・カート（本番を忠実再現）
│   ├── assets/               本番の実CSS(cart-common.css/theme.css) + 挙動JS(cart-app.js)
│   ├── cart/                 ショッピングカート
│   ├── member/regist/        会員登録 input → confirm → complete
│   └── mypage/               login → マイページ本体
│
└── original/                 ★本番テンプレート原本（Twig）。分析専用・変更禁止
```

---

## 3. 使い方（運用手順）

ローカル環境では、本番がサーバー側でやっていることを **データファイル + JavaScript** で代替しています。
編集対象は基本的に `data/` と各フォルダのHTMLだけです。

> 📘 **実コード例つきの詳しい手順（お知らせ/LP追加・トップやカート等の見た目変更）は
> [docs/HOWTO.md](docs/HOWTO.md) にまとめています。** 以下はその要約です。

### 3-1. 商品を追加・編集する
商品データは **[data/products.json](data/products.json)** に集約されています（175件）。
1件は次の形です（主なフィールド）：

```jsonc
{
  "itemId": "1923883",        // システム商品番号（詳細ページの ?id= に対応）
  "name": "商品名",
  "price": "380",             // 税込価格
  "itemCode": "HD-001",       // 商品コード
  "categoryId": "CG-00002",   // カテゴリー（下表参照）
  "imageUrl": "https://image.raku-uru.jp/...",
  "otherImages": ["..."],     // サブ画像
  "info1": "商品説明HTML",
  "published": "1",           // "1"=公開
  "active": "1"               // "1"=有効
}
```

- **公開されるのは `published==="1"` かつ `active==="1"` の商品だけ**（[js/shop.js](js/shop.js) の `published()`）。
- 一覧・詳細・検索・トップの新着/おすすめは、すべてこの1ファイルから描画されます。編集後はブラウザ再読込で反映。
- JSON は **BOMなしUTF-8** で保存すること（BOMが付くと `fetch().json()` 以外で壊れることがある）。

**カテゴリーID対応（[js/shop.js](js/shop.js) の `CATEGORIES`）**

| categoryId | 表示名 | | categoryId | 表示名 |
|---|---|---|---|---|
| CG-00004 | ウェア | | CG-00016 | 革製品グッズ |
| CG-00001 | 食品 | | CG-00018 | ガラスジュエリー |
| CG-00002 | 酒類 | | CG-00015 | 寮歌CD |
| CG-00003 | 文具 | | CG-00008 | その他 |
| CG-00019 | 小物 | | CG-00007 | おしょろ丸グッズ |
| CG-00017 | 生活雑貨 | | CG-00014 | ミズナラグッズ |

### 3-2. お知らせ（フリーページ）を追加する
`fr/` に `N.html` を追加します。`fr/_template.html` を複製し、タイトルと本文を書き換えるのが簡単です。
本番の `cart.raku-uru.jp/fr/{番号}` に相当します。

### 3-3. LP（ランディングページ）を追加する
1. `lp/` に `lp-〇〇/` フォルダを作り、`index.html` とバナー画像を置く（既存の `lp-sanrio/` が参考）。
2. トップのバナースライダー **[data/top-message1.html](data/top-message1.html)** にバナー1枚＋リンクを追記すると、
   トップから流入できるようになります。
3. 詳細は **[lp/README.md](lp/README.md)**。

### 3-4. トップページの見た目を変える
トップ本文は index.html に直書きせず、**別ファイルを差し込む**方式（本番の `dsnTopDesc` 注入と同じ）です。

| 差し込み先 | 内容 |
|---|---|
| [data/main-visual.html](data/main-visual.html) | メインビジュアル（大バナー） |
| [data/top-message1.html](data/top-message1.html) | ショップ説明1 ＝ LPバナースライダー |
| [data/top-message2.html](data/top-message2.html) | ショップ説明2 ＝ ご利用案内・酒類販売管理者標識など |

`index.html` の `Shop.include("#js-...", "./data/....html")` が読み込みます。

### 3-5. 会員登録・マイページ・カートを触る
`cart/` 配下は本番（`cart.raku-uru.jp`）の見た目・入力項目を忠実再現し、
挙動は **localStorage** で再現しています。詳細と一連フローは **[cart/README.md](cart/README.md)**。

主な入口URL（サーバー起動後）：
- 会員登録 … http://localhost:3000/cart/member/regist/input/
- ログイン … http://localhost:3000/cart/mypage/login/
- カート … http://localhost:3000/cart/cart/

---

## 4. 仕組みの要点（最小限）

- **描画方式** … 本番はサーバーが Twig テンプレートでHTMLを生成（SSR）。ローカルは静的HTML＋
  [js/shop.js](js/shop.js) が `products.json` を読んでブラウザ側で描画（データ駆動）。
- **クエリ付きリンクは拡張子なしで書く** … `serve` は `page.html?x=1` を `/page`（クエリ欠落）へ301
  リダイレクトしてしまう。これを避けるため、絞り込み・詳細・検索・並び替えのリンクは
  `product-list?categoryId=...` のように **`.html` を付けない**ルールにしている。
- **会員/カート/注文の状態** … 本番はサーバーのセッション/DB。ローカルは localStorage で代替。

図つきの詳しい解説は **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** を参照。

---

## 5. 制約・約束ごと

- **`original/` は本番テンプレートの原本**。分析・参照専用で、**中身は変更しない**こと。
- ローカルは**プレビュー専用**。実際の決済・会員登録・在庫連携は行われない（localStorage上の疑似挙動）。
- 本番へ戻す場合は、ローカルの「JS描画層／localStorage層」をらくうるカートのサーバー処理（Twig／API）に
  置き換える。各ページ冒頭の `<!-- 本番ルート: ... -->` コメントが対応先の道しるべ。

---

## 6. ドキュメント一覧

| ドキュメント | 内容 |
|---|---|
| [README.md](README.md)（本書） | 起動・使い方・運用手順の要約 |
| [docs/HOWTO.md](docs/HOWTO.md) | ★詳細操作マニュアル（実コード例つき手順） |
| [docs/LOCAL-SPEC.md](docs/LOCAL-SPEC.md) | ★ローカル再現サイト仕様書（実装ベース：描画エンジン・データ・localStorage・URL規約） |
| [docs/RAKUURU-SPEC.md](docs/RAKUURU-SPEC.md) | ★らくうるカート仕様書（変数・URL・データモデルを原本ベースで詳解） |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | らくうるカート本番の構造解説（図つき） |
| [docs/README.md](docs/README.md) | ドキュメント目次（docs/ の入口） |
| [docs/MAPPING.md](docs/MAPPING.md) | ローカル ↔ original テンプレートの対応 |
| [cart/README.md](cart/README.md) | 会員登録・マイページ・カートの再現詳細 |
| [lp/README.md](lp/README.md) | ランディングページの追加方法 |
| [fr/README.md](fr/README.md) | お知らせページの追加方法 |
