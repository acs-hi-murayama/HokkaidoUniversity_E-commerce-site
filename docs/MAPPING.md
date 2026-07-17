# ローカル ⇔ original（らくうるカート原本）マッピング表

ローカル再現環境の各ファイル・要素と、本番テンプレート原本 [`../original/`](../original/) の対応表です。
本番へ戻すときは「ローカルの実装 → 対応するTwig変数／本番パス」に置換する作業を、この表でチェックしながら進めます。
一括変換は **build-production スキル**（[../.claude/skills/build-production/SKILL.md](../.claude/skills/build-production/SKILL.md)）で行えます。

- 深い仕様は対の2冊を参照：ローカル実装 = [LOCAL-SPEC.md](LOCAL-SPEC.md) ／ 本番プラットフォーム = [RAKUURU-SPEC.md](RAKUURU-SPEC.md)
- 全体構造の図解 = [ARCHITECTURE.md](ARCHITECTURE.md)

> **最重要ルール**：ローカルと original は **HTML構造（class / id）を1:1に保つ**こと。
> CSSがclass/idに紐づくため、構造が一致していればローカルの見た目のまま本番へ移せる。
> なお`../original/` は**分析専用・変更禁止**。

---

## 1. ファイル対応

### 1-A. ストアフロント（hokudai-goods-seikyou.net 相当）
本番はカートが `Common_Part.html`（ヘッダ/フッタ/サイドバー）の `<[-- MAIN_CONTENTS --]>` に各ページ本体を差し込んで1枚のHTMLを生成する。
ローカルは共通枠を各HTMLに**直書きコピー**している（→ヘッダ/フッタ変更は全ページ横断修正が必要）。

| ローカル | original（本番原本） | 備考 |
|---|---|---|
| `../index.html` | `Toppage.html` ＋ `Common_Part.html` | トップ。本文は差し込み方式（§3） |
| `../product-list.html` | `Product_List.html` ＋ `Common_Part.html` | 商品一覧 |
| `../product-details.html` | `Product_Details.html` ＋ `Common_Part.html` | 商品詳細 |
| `../search.html` | `Product_Search.html` ＋ `Common_Part.html` | 検索結果 |
| `../404.html` | `404_Not_Found.html` ＋ `Common_Part.html` | 404。originalは断片、ローカルは完全版 |
| `../common-id-login.html` | `Common_ID_Login.html` | 共通IDログイン（独立HTML・旧スタブ） |
| `../members-only-login.html` | `Members-Only_Login.html` | 会員限定ログイン（独立HTML・旧スタブ） |

### 1-B. 取引アプリ（cart.raku-uru.jp 相当）※original原本なし
`cart/` は ASP 本体の画面を**実際の生HTML＋実CSS**から再現したもの。Twig原本は `original/` に無い（別ドメインのASP配信物）。
本番URL・画面IDは [RAKUURU-SPEC.md §4-2](RAKUURU-SPEC.md) 参照。

| ローカル | 本番URL | 画面ID |
|---|---|---|
| `../cart/cart/index.html` | `cart.raku-uru.jp/cart/{shpHash}` | CBY0001D01 |
| `../cart/member/regist/input/index.html` | `.../member/regist/input/{shpHash}` | MEM0001D01 |
| `../cart/member/regist/confirm/index.html` | `.../member/regist/confirm/{shpHash}` | MEM0001D02 |
| `../cart/member/regist/complete/index.html` | `.../member/regist/complete/{shpHash}` | MEM0001D03 |
| `../cart/mypage/login/index.html` | `.../mypage/login/{shpHash}` | MYP0001D01 |
| `../cart/mypage/index.html` | `.../mypage/{shpHash}` | MYP0002D01 |

### 1-C. 差し込みHTML・データ・スクリプト（ローカル固有の描画層）
本番のSSR（`{% for %}`・`{{ dsnTop* }}`）を、ローカルでは静的データ＋JSで代替している。

| ローカル | 役割 | 本番の対応 |
|---|---|---|
| `../data/products.json`（175件・実データ） | 全商品データ | 商品DB（`itemList` 等） |
| `../data/news.json` | お知らせ一覧（`{no,date,title}`）→ `fr/{no}.html` | `freepageList`（`/fr/{serialNo}`） |
| `../data/main-visual.html` | トップのキービジュアル | `{{ dsnTopHtmlTag }}` |
| `../data/top-message1.html` | 挨拶＋LPバナースライダー | `{{ dsnTopDesc1Shop }}` |
| `../data/top-message2.html` | 下部の案内文 | `{{ dsnTopDesc2Shop }}` |
| `../js/shop.js` | 商品描画エンジン（`window.Shop`） | サーバーSSR（不要） |
| `../fr/{1,2,3}.html`, `../fr/_template.html` | お知らせ本体・雛形 | フリーページ `/fr/{no}` |
| `../lp/lp-〇〇/`, `../lp/landing-page.html` ほか | LP各種 | `Landing_Page.html`（自由記述） |

### 1-D. CSS（本番と種類・役割・命名を統一）
`../css/` は `../original/css/` と**同一の5ファイル構成**（フォルダ名も小文字 `css`）。

| ローカル `css/` | original | 役割 |
|---|---|---|
| `common.css` | `original/css/common.css` | ストアフロント共通（トップ/一覧/詳細/検索/404/お知らせ）＝本番 `{{ cssAddr }}` |
| `common-id-login.css` | `original/css/common-id-login.css` | 共通IDログイン |
| `members-only-login.css` | `original/css/members-only-login.css` | 会員限定ログイン |
| `landing-page.css` | `original/css/landing-page.css` | ランディングページ |
| `cart.css` | `original/css/cart.css` | カート系テーマの原本（Twig変数入り） |

> 取引アプリ側の実CSSは別系統：`../cart/assets/cart-common.css`（＝ `/resources/css/cart-common.css`）＋
> `../cart/assets/theme.css`（＝ `/getCss/{shpHash}` の解決版）。ASP配信物のため `cart/assets/` に分離。

---

## 2. 共通ヘッダ/フッタ（`Common_Part.html` 相当）

| ローカルの実装 | Twig（本番） | 意味 |
|---|---|---|
| サイト名テキスト `北海道大学オンラインショップ` | `{{ shopName }}`（画像ロゴ時 `{{ hdrLogoImageUrl }}`） | 店舗名/ロゴ |
| 会員登録 `href="/cart/member/regist/input/"` | `{{ shpCartUrl }}/member/regist/input/{{ shpHash }}`（`newMemRegistFlag==1 and cartLoginStatus!=1`） | 会員登録 |
| マイページ `href="/cart/mypage/login/"` | `{{ shpCartUrl }}/mypage/login/{{ shpHash }}`（`registValidFlag==1`） | マイページ |
| カート `href="/cart/cart/"` | `{{ shpCartUrl }}/cart/{{ shpHash }}` | カート |
| （ログアウトは未実装） | `{{ shpCartUrl }}/logout/{{ shpHash }}`（`cartLoginStatus==1`） | ログアウト |
| 検索 `action="./search" method="get"` | `action="/search" method="post"` | 検索フォーム（`searchWord`） |
| カテゴリ（実12件・`?categoryId=CG-000xx`） | `{% for item in categoryList %}` → `item.categoryName`/`item.categoryId`/`item.childList`（`itemCount>0`のみ） | カテゴリ一覧 |
| ~~キャンペーン~~ **削除済み**（本番に無いため） | `{% for item in campaignList %}`（本番も空なら丸ごと非表示） | キャンペーン（不使用） |
| フッタリンク 特商法/個人情報/送料/会員規約/お問合せ | `/law` `/privacy` `/fee` `/membership`(registValidFlag) `{{shpCartUrl}}/ask/start/{{shpHash}}`(askpageUseFlag) | フッタリンク |
| SNS共有 | X: `http://twitter.com/share?url={{ shpUrl }}&text={{ shopName }}` / FB: `.../share.php?u={{ shpUrl }}` | SNS共有 |
| CSS `./css/common.css` | `{{ cssAddr }}` | スタイル |
| JS jQuery(CDN)＋slick(jsDelivr) | `{{shpImgUrl}}/cms/yt00037/js/*.js`（jquery/jquery-ui/flicksimple/common-script/shop-script）＋slick | スクリプト |
| `<title>` 固定 | `dsnTopTitle`/`pageTitle`/`itemData.itemName` 等の条件分岐（[RAKUURU-SPEC §1](RAKUURU-SPEC.md)） | ページタイトル |

> **カテゴリは実データ化済み**：categoryId↔名称は `js/shop.js` の `CATEGORIES`（12件）。
> リンクは全ページ拡張子なし `./product-list?categoryId=CG-000xx`（`serve` のクエリ落ち回避＝ローカル固有）。

---

## 3. トップページ（差し込み方式）

`index.html` は骨組みだけを持ち、中身をJSで別ファイルから注入する（本番の `dsnTop*` 差し込みと同型）。詳細は [LOCAL-SPEC §3](LOCAL-SPEC.md)。

| ローカル | Twig（本番） | 意味 |
|---|---|---|
| `#js-main-visual` ← `data/main-visual.html` | `{{ dsnTopHtmlTag }}`（`dsnTopVisualDispFlag==1`） | キービジュアル |
| `#js-top-message1` ← `data/top-message1.html` | `{{ dsnTopDesc1Shop }}`（`dsnTopDispFlag1Shop==1`） | 挨拶＋LPスライダー |
| `#js-news`（NEWS `<dl>`）← `data/news.json` を `Shop.renderNews` が最新N件 | `{% for item in freepageList %}` → `item.updateTime`/`item.title`/`/fr/{{ item.freepageSerialNo }}` | お知らせ |
| `#js-new`（`isNew` or 公開品先頭3件） | `{% for item in itemRecentList %}`（`dsnTopDispFlagNewItem`） | 新着 |
| `#js-recommend`（公開品先頭6件・順位バッジ） | `{% for item in itemRecommendList %}`（`loop.index+1`） | おすすめ |
| `#js-ranking`（HTMLコメントで休止中） | `{% for item in itemSalesRankingList %}`（本番も非表示） | 販売ランキング |
| `#js-top-message2` ← `data/top-message2.html` | `{{ dsnTopDesc2Shop }}`（`dsnTopDispFlag2Shop==1`） | 下部案内 |

---

## 4. 商品カード共通（一覧・新着・おすすめ・検索）

ローカルは `js/shop.js` の `Shop.card()` / `Shop.rankCard()` がHTMLを生成。本番は `{% for item %}` ループ。**カードのclass構造は両者一致**。

| ローカル（products.json のフィールド／描画） | Twig（本番） | 意味 |
|---|---|---|
| 詳細リンク `./product-details?id={itemId}` | `/item-detail/{{ item.itemId }}` | 商品詳細リンク |
| `imageUrl`（`image.raku-uru.jp` 実URL） | `item.dispMediaUrlSmall` / `mediaUrlSmall` | サムネイル |
| `name`（実商品名） | `{{ item.itemName }}`（alt含む） | 商品名 |
| `Shop.yen(price)` → `¥729` | `{{ item.displayPrice }}` | 価格 |
| `<span class="tax">（税込）</span>` | `<span class="tax">{{ item.displayTax }}</span>` | 税表記 |
| （在庫切れ表示は未使用） | `{{ item.stockOutMessage }}` → `.item-nonstock` | 在庫切れ |
| （バッジ未使用） | `item.badgeId` → `icon-badge{{ item.badgeId }}` | バッジ |
| `Shop.rankCard()` の `rank{n}` | `loop.index+1` の順位 | 順位バッジ |

> **移行**：`js/shop.js`＋`data/products.json` は本番へ持ち込まない。「JSで流し込む中身」を Twig 変数へ戻すだけ。
> 商品データ自体はらくうるカート管理画面へCSVインポート（`data/products.json` は本番CSVから生成した実データ）。

---

## 5. 商品詳細（`Product_Details.html`）

`product-details.html` は `?id=` の1ページで全商品を出し分け（`Shop.byId`）。本番は1商品=1描画（`itemData`）。

| ローカル | Twig（本番） | 意味 |
|---|---|---|
| `name` | `{{ itemData.itemName }}` | 商品名 |
| `imageUrl` / `otherImages[]` | `variationList[0].mediaUrlLarge` / `itemData.otherMediaUrlsLarge` | メイン/サブ画像 |
| `Shop.yen(price)` | `{{ variationList[0].displaySalePrice }}` ほか価格系 | 価格 |
| `info1`（商品説明HTML） | `itemData.itemInfo1` 等 | 商品説明 |
| 「カートに入れる」→ `TX.addToCart`（localStorage） | フォーム `action="{{ shpCartUrl }}/incart"` POST（`itemId`/`variationId`/`itemQuantity`） | カート投入 |
| （数量UIあり） | `itemData.numericFormType`（1=±/2=select/3=固定） | 数量 |
| hidden itemId | `{{ itemData.itemId }}` ＋ `{{ shpHash }}` | 送信hidden |

詳しいフォーム仕様は [RAKUURU-SPEC §5](RAKUURU-SPEC.md)。

---

## 6. 一覧・検索（`Product_List.html` / `Product_Search.html`）

| ローカル | Twig（本番） | 意味 |
|---|---|---|
| カテゴリ名で見出し/パンくず/リード更新（`#js-cat-title` 等） | `{{ title1 }}` / `{{ title2 }}` / `{{ description }}` | 見出し・説明 |
| 並び替え `?sortKind=1/2`（価格昇順/降順・JSでsort） | `sortKind` 分岐 ＋ `/item-list?sortKind=N{{ condition }}` | ソート |
| `?categoryId=` でフィルタ（JS） | サーバー側の絞り込み（`condition`） | カテゴリ絞込 |
| 検索 `?searchWord=` を `name` に部分一致（JS） | `/search`（POST）→ `itemList` | 検索 |
| 件数表示（`#js-count`） | `{{ startNum }}〜{{ endNum }} / {{ totalCount }}` | 件数 |
| （ページャ未実装・全件表示） | `backPageVisible`/`nextPageVisible`/`pageList`/`pageIndex` | ページング |
| 0件時「該当する商品がありません」 | `totalCount==0` / `itemList is empty` | 0件 |

---

## 7. LP・ログイン・404

### LP（`../lp/` → `Landing_Page.html`）
- 本番LPは**独立HTML**：ロゴ中央（`h_center`）、`body class="body-lp"`、本文は `<div class="wysiwyg-data"><[-- MAIN_CONTENTS --]></div>`。
- ローカルは `../lp/lp-〇〇/index.html`（1LP=1フォルダ）。作り込んだ本文をそのまま本番の MAIN_CONTENTS（WYSIWYG）へ移植可能。
- `../lp/landing-page.html` / `../lp/honban.html` / `../lp/_template.html` は雛形・参考。追加手順は [../lp/README.md](../lp/README.md)。

### ログイン（`Common_ID_Login.html` / `Members-Only_Login.html`）
- 独立HTML（`body class="body-login"`・ロゴ中央）。ローカルは**旧スタブ**（実ログインは `cart/mypage/login/` に統合）。
- メッセージ変数 `{{ loginError }}` / `{{ loginDesc }}` / `{{ loginTitle }}` など。

### 404（`404_Not_Found.html`）
- originalは MAIN_CONTENTS に入る断片。ローカルはヘッダ/フッタ込みの完全版。

---

## 8. お知らせ `fr/`（フリーページ）

| ローカル | 本番 | 備考 |
|---|---|---|
| `../fr/{1,2,3}.html` | `/fr/{freepageSerialNo}` | 本体 |
| `../fr/_template.html`（`__PAGE_TITLE__` 等のプレースホルダ） | 管理画面 フリーページ | ローカルの雛形 |
| `data/news.json` に1件追記（`{no,date,title}`） | `{% for item in freepageList %}`（自動） | トップ一覧は本番自動／ローカルは news.json 参照。`index.html` は不変 |

追加手順は [../fr/README.md](../fr/README.md) と [HOWTO.md §1](HOWTO.md)。

---

## 9. 本番移行チェックリスト

各ページ移行時に確認（一括変換は build-production スキル）：

- [ ] HTML構造（class/id）が original と一致しているか
- [ ] 画像：商品は Twig 変数へ／LPは実URL直書きのまま
- [ ] 内部リンク：拡張子なしのローカルURL → 本番パス（`/item-detail/...`, `/item-list?...`, `{{shpCartUrl}}/...`）
- [ ] 検索フォーム `method="get" action="./search"` → `method="post" action="/search"`
- [ ] CSS `./css/common.css` → `{{ cssAddr }}`／取引ページは `/resources/css/cart-common.css` ＋ `/getCss/{{shpHash}}`
- [ ] JS `code.jquery.com`/jsDelivr → `{{shpImgUrl}}/cms/yt00037/js/*`
- [ ] `js/shop.js`・`cart/assets/cart-app.js`・`data/*` は本番へ持ち込まない（サーバー描画へ置換）
- [ ] トップ差し込み（main-visual/top-message1/2）→ `{{ dsnTopHtmlTag }}`/`{{ dsnTopDesc1/2Shop }}`
- [ ] 商品データ → らくうるカート管理画面へCSVインポート
- [ ] ヘッダ/フッタは `Common_Part.html` に集約（各ページは MAIN_CONTENTS のみに整理）
- [ ] 取引フォームに `{{ _csrf }}` / `{{ shpHash }}` hidden を復元
