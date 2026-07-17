# production-build デプロイ手順（本番＝らくうるカートへの移行）

このフォルダは、ローカル再現環境を **本番（らくうるカート）へ移行できる形** に組み立てたものです。
ストアフロントは `original/`（本番テンプレ原本）を忠実に模倣した **Twigテンプレート構成** になっています。

## フォルダ構成と投入先
| フォルダ/ファイル | 中身 | 本番での投入先 |
|---|---|---|
| `HTML/Common_Part.html` | 共通枠（head/ヘッダ/ナビ/パンくず/サイドバー/フッタ/JS）＋差し込み口 | テーマ編集：共通テンプレート |
| `HTML/Toppage.html` | トップ本文（`{{ dsnTop* }}` / `{% for %}`） | テーマ編集：トップページ |
| `HTML/Product_List.html` | 商品一覧（`{% for item in itemList %}`＋ページャ） | テーマ編集：商品一覧 |
| `HTML/Product_Details.html` | 商品詳細（`/incart` フォーム・バリエーション・数量） | テーマ編集：商品詳細 |
| `HTML/Product_Search.html` | 検索結果 | テーマ編集：検索結果 |
| `HTML/404_Not_Found.html` | 404 | テーマ編集：404 |
| `HTML/Landing_Page.html` | LP枠（`wysiwyg-data` に本文差し込み） | テーマ編集：フリーページ/LP |
| `HTML/Common_ID_Login.html` / `Members-Only_Login.html` | ログイン画面 | テーマ編集：ログイン |
| `css/*.css` | テーマCSS（`{{ cssAddr }}` の実体） | テーマのCSSへアップロード |
| `design-settings/*.html` | トップの差し込み内容 | 管理画面「デザイン設定」の各欄に貼付 |
| `data/products.json` | 商品175件 | 管理画面「商品管理」へCSVインポート |
| `fr/fr-*.html` | お知らせ本文（WYSIWYG断片・絶対URL） | 管理画面「フリーページ」に本文貼付（トップは `freepageList` が自動掲載） |
| `lp/lp-*.html` | LP本文（`<style>`＋WYSIWYG断片） | 管理画面でLPフリーページを作成し本文貼付（`/lp/{n}` で公開） |
| `cart/**` | 取引画面（会員/カート/マイページ） | ASP標準画面。**店舗はHTML構造を編集不可**（本番の見た目確認用の参考） |

## 使われている本番Twig変数（主なもの）
- 共通: `{{ shopName }}` `{{ shpUrl }}` `{{ shpCartUrl }}` `{{ shpHash }}` `{{ shpImgUrl }}` `{{ cssAddr }}` `{{ topFaviconUrl }}`
- トップ: `{{ dsnTopHtmlTag }}` `{{ dsnTopDesc1Shop }}` `{{ dsnTopDesc2Shop }}` / `freepageList` `itemRecentList` `itemRecommendList`
- 一覧/詳細: `{% for item in itemList %}` `itemData.*` `variationList` `{{ shpCartUrl }}/incart`
- 取引: `/getCss/{{ shpHash }}` `/resources/css` `/resources/js` `{{ _csrf }}`

## 移行手順
1. **テーマHTML**：`HTML/*.html` をらくうるカートのテーマ編集画面の対応枠へ貼る（Common_Part＝共通、各ページ＝本文）。
2. **CSS**：`css/*.css` をテーマCSSへアップロード（`{{ cssAddr }}` が配信）。
3. **商品**：`data/products.json` をCSV化して商品インポート。画像は本番CDN（`image.raku-uru.jp`）を参照済み。
4. **デザイン設定**：`design-settings/*.html` を管理画面のデザイン設定（キービジュアル/ショップ説明1・2）に貼付。
5. **お知らせ**：`freepages/fr-*.html` をフリーページに登録。
6. **確認**：カテゴリ・在庫・バリエーション等はSSR（`itemList`/`itemData`）が描画。取引画面はASP標準。

## お知らせ（fr/）とLP（lp/）— 本日生成分
本番実例（`original/fr` `original/lp`）の規約を模倣し、ローカルのお知らせ/LPを**WYSIWYG本文断片**に変換したもの。

- お知らせ: fr/fr-1.html（堀内、パチンコ辞める。） / fr/fr-2.html（堀内、タバコ辞める。） / fr/fr-3.html（堀内、寝不足。）
- LP（自動変換）: lp/lp-bear.html / lp/lp-beer.html / lp/lp-someya1.html / lp/lp-someya2.html / lp/lp-sanrio.html
- LP（手動対応が必要）: （なし）

投入手順：
1. `fr/fr-*.html` の中身を管理画面「フリーページ」の本文（WYSIWYG）に貼付。タイトル/日付はフリーページの項目に設定。→ トップの「お知らせ」に `freepageList` として自動掲載。
2. `lp/lp-*.html` の中身をLP用フリーページ（`Landing_Page` テーマ）の本文に貼付。公開URL `/lp/{n}` を採番。
3. **画像**：各断片の `src` はローカル相対パスのまま。らくうるカートへ画像をアップロードし `https://image.raku-uru.jp/...` のURLへ差し替える。
4. リンクは本番の絶対URL（`https://hokudai-goods-seikyou.net/item-detail/… /item-list …`）へ変換済み。

## 注意
- `design-settings/top-message1.html` のLPスライダーはローカル画像・`/lp/…`参照。**LP本体と画像は本番側で用意/ホスティング**が必要（`HTML/Landing_Page.html` を使用）。
- LPの `<style>` に `body.body-lp #container{…}` 等のローカル前提セレクタが含まれる場合あり（本番では無害だが不要なら削除）。
- `lp-sanrio` は元 dc-format（JS駆動）。本番用に lp-hokudai150year 方式（静的HTML＋素の`<script>`）へ書き直した `lp/lp-sanrio/index.prod.html` から自動変換。JSの挙動（見どころスライダー／数量ステッパー／カート追加POST）は移植済み。カート追加は `cart.raku-uru.jp/incart` への fire-and-forget POST（元の挙動のまま。確実な追加が必要ならフォーム送信への切替を検討）。ローカル `index.html` は dc版のまま。
- キャンペーンは `Common_Part.html` に汎用ループがあるが `campaignList` が空なら非表示（本番は未設定）。
- `js/shop.js` `cart/assets/*` はローカル専用のため本番へは持ち込まない（サーバーが描画/処理）。
