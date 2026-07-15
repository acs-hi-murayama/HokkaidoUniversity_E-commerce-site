# ドキュメント目次（docs/）

北大オリジナルグッズ Online Shop ローカル再現環境の**ドキュメント集**です。
まず全体像を知りたい方は、プロジェクト入口の **[../README.md](../README.md)** から読んでください。

---

## 収録ドキュメント一覧

| ドキュメント | 種別 | 内容 |
|---|---|---|
| [HOWTO.md](HOWTO.md) | 操作手順 | ★**まず読む実務マニュアル**。お知らせ/LP追加、トップ・カート等の見た目変更を、実コード例・行番号つきで手順化 |
| [LOCAL-SPEC.md](LOCAL-SPEC.md) | 仕様書 | ★**ローカル実装の技術仕様**。描画エンジン`shop.js`、`products.json`データモデル、localStorage、URL規約 |
| [RAKUURU-SPEC.md](RAKUURU-SPEC.md) | 仕様書 | ★**らくうるカート本番の仕様**。Twig変数・URL体系・データモデル・テーマを原本ベースで詳解 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 構造解説 | 本番の2ドメイン構成・SSR・取引フローを**図（Mermaid）つき**で解説。本番↔ローカルの対応表 |
| [MAPPING.md](MAPPING.md) | 対応表 | ローカルの各ファイル ↔ `original/`（本番テンプレ原本）の対応 |
| [products_itemid_list.csv](products_itemid_list.csv) | データ | 商品ID一覧（参照用） |

> ★印は解像度の高い主要ドキュメントです。

---

## 目的別・おすすめの読む順番

### 🛠 サイトを更新・運用したい（お知らせ/商品/LP/見た目）
1. [../README.md](../README.md) … 起動と全体像
2. **[HOWTO.md](HOWTO.md)** … 具体的な変更手順（ほぼこれだけでOK）
3. 必要に応じて [LOCAL-SPEC.md](LOCAL-SPEC.md) … 仕組みを深掘りするとき

### 🧭 このローカル環境の作りを理解したい（引き継ぎ・改修）
1. [ARCHITECTURE.md](ARCHITECTURE.md) … 本番とローカルの関係を図で把握
2. **[LOCAL-SPEC.md](LOCAL-SPEC.md)** … 実装（JS/データ/localStorage/URL）の詳細
3. [MAPPING.md](MAPPING.md) … どのファイルが本番の何に対応するか

### 🏭 らくうるカート本番の仕様を知りたい／本番へ戻したい
1. [ARCHITECTURE.md](ARCHITECTURE.md) … 2ドメイン構成・SSR・取引フロー
2. **[RAKUURU-SPEC.md](RAKUURU-SPEC.md)** … Twig変数・URL・テーマの詳細仕様
3. 本番化スキル … [../.claude/skills/build-production/SKILL.md](../.claude/skills/build-production/SKILL.md)

---

## 仕様書の対応関係

本番とローカルは対になっています。読み比べると移行ポイントが見えます。

| | 本番（らくうるカート） | ローカル再現 |
|---|---|---|
| 仕様書 | [RAKUURU-SPEC.md](RAKUURU-SPEC.md) | [LOCAL-SPEC.md](LOCAL-SPEC.md) |
| 描画 | Twig SSR（`{% for item %}`） | `js/shop.js` + `products.json` |
| トップ差し込み | `{{ dsnTopDesc1Shop }}` 等 | `Shop.include()` + `data/*.html` |
| 取引の状態 | サーバーのセッション/DB | localStorage（`cart-app.js`） |

構造の橋渡しは [ARCHITECTURE.md](ARCHITECTURE.md)、両者のファイル対応は [MAPPING.md](MAPPING.md) を参照。

---

## 関連ドキュメント（docs/ の外）

| 場所 | 内容 |
|---|---|
| [../README.md](../README.md) | プロジェクト入口（起動・使い方・フォルダ地図） |
| [../cart/README.md](../cart/README.md) | 会員登録・マイページ・カートの再現詳細 |
| [../lp/README.md](../lp/README.md) | ランディングページの追加方法 |
| [../fr/README.md](../fr/README.md) | お知らせページの追加方法 |
| [../.claude/skills/build-production/SKILL.md](../.claude/skills/build-production/SKILL.md) | ローカル→本番の変換スキル |
