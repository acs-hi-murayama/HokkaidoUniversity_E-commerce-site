# ローカル版 ⇔ らくうるカート（Twig）マッピング表

ローカルの静的HTML（プロジェクト直下）と、らくうるカート用テンプレート（`original/HTML/`）の対応表。
本番移行時は「ローカルのダミー値 → 対応するTwig変数」に戻す作業をこの表でチェックしながら進める。

- **ローカル版**: 見た目確認・LP試作用。ダミーデータ・`picsum.photos`仮画像・相対リンク。
- **original版（正本）**: らくうるカートに貼り付ける。`{{ }}`/`{% %}` はカート側サーバーが実データで展開。
- **CSS**: class名・IDに紐づく。**構造（class/id）は両者で1:1に保つこと**が最重要。

---

## 0. ファイル対応

| ローカル（直下） | original（カート用） | 備考 |
|---|---|---|
| `index.html` | `original/HTML/Toppage.html` + `Common_Part.html` | ローカルはヘッダ/フッタ込みの完全HTML。originalはMAIN_CONTENTS部分のみ |
| `product-list.html` | `original/HTML/Product_List.html` + `Common_Part.html` | 商品一覧 |
| `product-details.html` | `original/HTML/Product_Details.html` + `Common_Part.html` | 商品詳細 |
| `search.html` | `original/HTML/Product_Search.html` + `Common_Part.html` | 検索結果 |
| `common-id-login.html` | `original/HTML/Common_ID_Login.html` | 共通IDログイン（独立HTML、Common_Part不使用） |
| `members-only-login.html` | `original/HTML/Members-Only_Login.html` | 会員限定ログイン（独立HTML） |
| `landing-page.html` | `original/HTML/Landing_Page.html` | LP（独立HTML、MAIN_CONTENTSに自由記述） |
| `404.html` | `original/HTML/404_Not_Found.html` | 404 |

### CSS ファイル（本番と種類・役割・命名を統一）

`css/` は本番 `original/css/` と**同一の5ファイル構成**（旧命名の重複ファイルは整理済み。フォルダ名も小文字 `css` に統一）。

| ローカル `css/` | original | 役割（どのページが使うか） |
|---|---|---|
| `common.css` | `original/css/common.css` | ストアフロント共通（トップ/一覧/詳細/検索/404/お知らせ）＝本番の `{{ cssAddr }}` |
| `common-id-login.css` | `original/css/common-id-login.css` | 共通IDログイン（`common-id-login.html`） |
| `members-only-login.css` | `original/css/members-only-login.css` | 会員限定ログイン（`members-only-login.html`） |
| `landing-page.css` | `original/css/landing-page.css` | ランディングページ |
| `cart.css` | `original/css/cart.css` | カート/会員/マイページ用テーマの原本（Twig変数入り）。解決版は `cart/assets/theme.css` |

> 取引アプリ（cart.raku-uru.jp）側の実CSS `cart/assets/cart-common.css`（＝ `/resources/css/cart-common.css`）と
> `cart/assets/theme.css`（＝ `/getCss/{hash}`）は別ドメインのASP配信物。役割が異なるため `cart/assets/` に分離。

### 共通の仕組み（重要）
- original版はカート側が **`Common_Part.html`（ヘッダ/フッタ/サイドバー）** の `<[-- MAIN_CONTENTS --]>` に各ページ本体を差し込んで1枚のHTMLを生成する。
- ローカル版は `Common_Part.html` 相当のヘッダ/フッタを各HTMLに直接ベタ書きしてある（＝コピー）。
  → **ヘッダ/フッタを直すときは全ローカルHTMLを横断修正**する必要がある点に注意。

---

## 1. 共通ヘッダ/フッタ（Common_Part.html 相当）

| ローカルのダミー値 | Twig変数 | 意味 |
|---|---|---|
| `北海道大学オンラインショップ`（サイト名テキスト） | `{{ shopName }}` | 店舗名 |
| ロゴ：テキスト表示 `site-name-txt` | `hdrLogoDispFlag==1 and hdrLogoImageUrl` で `<img src="{{ hdrLogoImageUrl }}">` | ヘッダロゴ画像 |
| フッタロゴ：テキスト | `ftrLogoDispFlag==1 and ftrLogoImageUrl` → `{{ ftrLogoImageUrl }}` | フッタロゴ画像 |
| 会員登録リンク `href="#"` | `{{ shpCartUrl }}/member/regist/input/{{ shpHash }}`（`newMemRegistFlag==1 and cartLoginStatus!=1`） | 会員登録 |
| マイページ `href="#"` | `{{ shpCartUrl }}/mypage/login/{{ shpHash }}`（`registValidFlag==1`） | マイページ |
| カート `href="#"` | `{{ shpCartUrl }}/cart/{{ shpHash }}` | カート |
| （ログアウトリンクなし） | `{{ shpCartUrl }}/logout/{{ shpHash }}`（`cartLoginStatus==1`のとき表示） | ログアウト |
| 検索 `action="./search.html" method="get"` | `action="/search" method="post"` | 検索フォーム |
| カテゴリ固定4件（文房具/衣類/食品/雑貨） | `{% for item in categoryList %}` → `item.categoryName` / `item.categoryId` / `item.childList` | カテゴリ一覧（`itemCount>0`のみ表示） |
| キャンペーン固定2件（春の新入生/150周年） | `{% for item in campaignList %}` → `item.campaignName` / `item.campaignId` | キャンペーン一覧 |
| （パンくずなし or 固定） | `{% for item in breadCrumbsList %}` → `item.url` / `item.displayValue` | パンくず |
| （カレンダーなし） | `{% for monthItem in calendarMonthList %}` … `eventList` | 営業カレンダー |
| フッタリンク（特商法/個人情報/送料/会員規約/お問合せ） | `/law` `/privacy` `/fee` `/membership`(registValidFlag) `{{shpCartUrl}}/ask/start/{{shpHash}}`(askpageUseFlag) | フッタリンク |
| SNS共有 `href="#"` | X: `http://twitter.com/share?url={{ shpUrl }}&text={{ shopName }}` / FB: `http://www.facebook.com/share.php?u={{ shpUrl }}` | SNS共有 |
| コピーライト `北海道大学オンラインショップ` | `{{ shopName }}` | コピーライト |
| CSS `./css/common.css` | `{{ cssAddr }}` | スタイルシート |
| JS `https://code.jquery.com/...`, jsDelivr slick | `{{shpImgUrl}}/cms/yt00037/js/*.js`（jquery, jquery-ui, flicksimple, common-script, shop-script）+ slick(jsDelivr) | スクリプト群 |
| `<title>北海道大学オンラインショップ（テスト）` | 複雑な条件分岐（`dsnTopTitle`/`pageTitle`/`itemData.itemName`等） | ページタイトル |

---

## 2. index.html（トップページ）

対応: `original/HTML/index.html`（本体）は `dsnTop*` 系フラグで各セクションを出し分け。

| ローカルのダミー値 | Twig変数 | 意味 |
|---|---|---|
| キービジュアル `picsum.photos/seed/hku1〜3/1200/450` | `{{ dsnTopHtmlTag }}`（`dsnTopVisualDispFlag==1`） | トップビジュアル（HTMLタグごと差し込み） |
| （フリー1エリアなし） | `{{ dsnTopDesc1Shop }}`（`dsnTopDispFlag1Shop==1`） | ショップ説明文1 |
| お知らせ見出し `NEWS / お知らせ` | `{{ dsnTopTitle1Info }}` / `{{ dsnTopTitle2Info }}` | お知らせ見出し |
| お知らせ3件（日付+タイトル、`href="#"`） | `{% for item in freepageList %}` → `item.updateTime` / `item.title` / `href="/fr/{{ item.freepageSerialNo }}"` | お知らせ一覧 |
| 新着見出し `NEW ARRIVALS / 新着商品` | `{{ dsnTopTitle1NewItem }}` / `{{ dsnTopTitle2NewItem }}` | 新着見出し |
| 新着商品9件（item1〜9） | `{% for item in itemRecentList %}` → 下記「商品カード共通」参照 | 新着商品一覧 |
| おすすめ見出し | `{{ dsnTopTitle1Ranking }}` / `{{ dsnTopTitle2Ranking }}` | おすすめ見出し |
| おすすめ（ランク番号付き） | `{% for item in itemRecommendList %}`（`loop.index+1` でランク） | おすすめ一覧 |
| 販売ランキング見出し | `{{ dsnTopTitle1SalesRanking }}` / `{{ dsnTopTitle2SalesRanking }}` | 販売ランキング見出し |
| 販売ランキング | `{% for item in itemSalesRankingList %}`（`item.variationName` 表示あり） | 販売ランキング一覧 |
| （フリー2エリアなし） | `{{ dsnTopDesc2Shop }}`（`dsnTopDispFlag2Shop==1`） | ショップ説明文2 |

---

## 3. 商品カード共通（一覧・新着・おすすめ・検索・詳細のRECOMMEND）

ローカルの各 `<li>`（商品カード）は、originalでは以下のループ内テンプレートに戻す。

| ローカルのダミー値 | Twig変数 | 意味 |
|---|---|---|
| リンク `./product-details.html` | `/item-detail/{{ item.itemId }}` | 商品詳細リンク |
| 画像 `picsum.photos/seed/itemN/300/300` | `item.dispMediaUrl` 有→`{{ item.dispMediaUrlSmall }}` / 無→`{{ item.mediaUrlSmall }}` | サムネイル |
| `alt="北大ロゴ入りマグカップ"` 等 | `alt="{{ item.itemName }}"` | 商品名(alt) |
| 商品名テキスト | `{{ item.itemName }}` | 商品名 |
| 価格 `¥1,650` | `{{ item.displayPrice }}` | 価格 |
| `（税込）` | `<span class="tax">{{ item.displayTax }}</span>` | 税表記 |
| （在庫切れ表示なし） | `{{ item.stockOutMessage }}`（`is not empty`のとき `<p class="item-nonstock">`） | 在庫切れメッセージ |
| （バッジなし） | `item.badgeId` → class `icon-badge{{ item.badgeId }}` | バッジ |
| （予約表示なし） | `item.shpRsvFlag==1` → class `icn-reservation` | 予約商品 |

### ⭐ ローカルのデータ駆動描画（js/shop.js + data/products.json）
現在、商品を表示する4ページ（トップ新着/おすすめ/ランキング・商品一覧・検索・商品詳細）は
ダミーHTMLをやめ、**`data/products.json` を読み込んで `js/shop.js` が描画**する方式に変更済み。
（`data/products.json` はらくうるカートの商品エクスポートCSVから生成した実データ175件）

| ローカルの仕組み | 対応する本番(Twig) | 備考 |
|---|---|---|
| `Shop.load()` で products.json 取得 | サーバーが `itemList`/`itemRecentList` 等を注入 | 本番はJS不要 |
| `#js-list` に `Shop.card()` を流し込み | `{% for item in itemList %}…{% endfor %}` | カード構造は同一クラス |
| 商品詳細 `?id=システム商品番号` で描画 | `/item-detail/{{ itemId }}` + `itemData` | ローカルは1ページで全商品を出し分け |
| 検索 `?searchWord=` で名前フィルタ | `/search`（POST）→ `itemList` | ローカルはJSでフィルタ |
| トップ `isNew==1` → 新着 | `itemRecentList`（`dsnTopDispFlagNewItem`） | |
| `Shop.rankCard()` 順位バッジ | `itemRecommendList`/`itemSalesRankingList` | |

> **移行時**：`js/shop.js` と `data/products.json` は本番へ持って行かない（サーバー描画に置換）。
> カード/詳細のHTML構造は original の `{% for %}` ループと一致させてあるので、
> 「JSで流し込んでいる中身」を Twig 変数に戻すだけで移行できる。
> ⚠ カテゴリ番号（CG-000XX）は名称マスタが別途必要（このCSVに名称は無い）。サイドバーのカテゴリ名は現状ダミー。

### 商品名 ⇔ 仮画像seed 対応（※旧ダミー。現在は products.json を使用）
| seed | 商品名 |
|---|---|
| item1 | 北大ロゴ入りマグカップ |
| item2 | 北大クリアファイル（3枚セット） |
| item3 | 北大オリジナルトートバッグ |
| item4 | 北大ポプラ並木フレームセット |
| item5 | 北大ボールペン（2本セット） |
| item6 | 北大ロゴ入りパーカー（Mサイズ）／※product-listではエコバッグに割当 |
| item7 | 北大クッキー缶（12枚入り） |
| item8 | 北大エコバッグ |
| item9 | 北大ノート（A5・3冊セット） |

> ⚠ `item6` はページによって商品名が違う（index=パーカー、product-list=エコバッグ）。移行前に実データで統一すること。

---

## 4. product-details.html（商品詳細）

対応: `original/HTML/Product_Details.html`

| ローカルのダミー値 | Twig変数 | 意味 |
|---|---|---|
| 商品名 `北大ロゴ入りマグカップ` | `{{ itemData.itemName }}`（予約時 `ttl-reservation`） | 商品名 |
| メイン画像 `picsum.photos/seed/item1/600/600` | `{{ variationList[0].mediaUrlLarge }}` | メイン画像 |
| サブ画像 `item1b`, `item1c`（/600/600） | `{% for otherMediaUrlLarge in itemData.otherMediaUrlsLarge %}` | 追加画像（大） |
| サムネイル `item1/item1b/item1c`（/80/80） | `variationList[0].mediaUrlSmall` + `itemData.otherMediaUrlsSmall` | サムネイル |
| 販売価格（固定） | `{{ variationList[0].displaySalePrice }}` / `displaySaleTax` | 販売価格 |
| 会員価格 | `variationList[0].displayMmbrPrice` / `displayMmbrTax` | 会員価格 |
| 通常価格 | `variationList[0].displayNormalPrice` / `displayNormalTax` | 通常価格 |
| 在庫 | `variationList[0].displayStock` | 在庫 |
| 商品コード / JAN | `variationList[0].itemCd` / `jancode` | コード類 |
| バリエーション選択（サイズ等） | `{% for variation in variationList %}` → `variation.variationName` / `variationId` | バリエーション |
| 数量入力 | `itemQuantity` / `quantityField` | 数量 |
| 「カートに入れる」`href="#"` | フォーム `action="{{ shpCartUrl }}/incart"` + `raku-add-cart` | カート投入 |
| カテゴリ/メーカー/ブランド等スペック | `itemData.categoryName` / `makerName` / `brandName` / `campaignList` ほか | 商品スペック |
| 商品説明 | `itemData.itemInfo1` / `itemInfo2` / `itemInfo3` | 商品説明文 |
| RECOMMENDED おすすめ4件 | `{% for item in itemRecommendList %}`（商品カード共通） | おすすめ |
| hidden itemId / shpHash | `{{ itemData.itemId }}` / `{{ shpHash }}` | 送信用hidden |

---

## 5. product-list.html / search.html（一覧・検索）

対応: `original/HTML/Product_List.html` / `Product_Search.html`

| ローカルのダミー値 | Twig変数 | 意味 |
|---|---|---|
| カテゴリ見出し（固定） | `{{ title1 }}` / `<span class="sub-title">{{ title2 }}</span>` | 見出し（検索は「「{{title2}}」に関する検索結果一覧」） |
| リード文（固定 or なし） | `{{ description }}` | 説明文 |
| 並び替えリンク（価格/更新日） | `sortKind` 分岐 + `/item-list?sortKind=N{{ condition }}` | ソート |
| 商品6件（商品カード共通） | `{% for item in itemList %}` | 商品一覧 |
| 表示件数（固定） | `{{ startNum }}〜{{ endNum }} / {{ totalCount }}` | 件数表示 |
| ページャ BACK/NEXT/番号 | `backPageVisible` / `nextPageVisible` / `pageList` / `pageIndex` | ページネーション |
| （0件表示） | `totalCount==0`（一覧）/ `itemList is empty`（検索） → 「該当する商品がありません」 | 0件時 |

---

## 6. LP・ログイン・404

### landing-page.html（`Landing_Page.html`）
- **独立HTML**。ヘッダはロゴ中央（`h_center`）、`body class="body-lp"`、本体は `<div class="wysiwyg-data"><[-- MAIN_CONTENTS --]></div>`。
- LP本文はカートの「自由記述（WYSIWYG）」に入る。**ローカルで作り込んだLP本文をそのまま MAIN_CONTENTS に移植可能**（最も再利用しやすい）。
- 画像 `picsum.photos/seed/lp1〜3/400/300` → 実画像URL（LP内は実URL直書きでOK）。
- `{{ shopName }}` / `{{ hdrLogoImageUrl }}` / `{{ ftrLogoImageUrl }}` / SNS / コピーライトはヘッダ/フッタ共通。
- Googleフォント: Noto Sans JP + Kaisei Tokumin（LP専用で追加読み込みあり）。

### common-id-login.html / members-only-login.html（`Common_ID_Login.html` / `Members-Only_Login.html`）
- **独立HTML**。`body class="body-login"`、ロゴ中央。
- ログインフォーム: `comLoginId` / `comLoginPassword`（共通ID）。会員限定側は入力名が異なる可能性 → 移行時に original を確認。
- `{{ loginError }}` / `{{ loginDesc }}` / `{{ loginTitle }}` / `{{ loginMetadescription }}` などのメッセージ変数。
- トップと同じ `dsnTop*`（ビジュアル/お知らせ）を `loginTop*DispFlag` で出し分け可能。

### 404.html（`404_Not_Found.html`）
- originalは11行の断片（`Common_Part.html` の MAIN_CONTENTS に入る想定）。ローカルはヘッダ/フッタ込みの完全版。

---

## 7. 本番移行チェックリスト（テンプレ）

各ページ移行時に確認:

- [ ] ローカルで確定したHTML構造（class/id）が original と一致しているか
- [ ] `picsum.photos` 仮画像 → 実画像（商品画像はTwig変数に戻す／LPは実URL直書き）
- [ ] 相対リンク `./xxx.html` → カートの正規パス（`/item-detail/...`, `/item-list?...`, `{{shpCartUrl}}/...`）
- [ ] ダミーテキスト → Twig変数 or 実文言
- [ ] 検索フォーム `method="get" action="./search.html"` → `method="post" action="/search"`
- [ ] CSS参照 `./css/common.css` → `{{ cssAddr }}`
- [ ] JS参照 → `{{shpImgUrl}}/cms/yt00037/js/*`
- [ ] `item6` など商品名のページ間ゆらぎを解消
- [ ] LP: ローカル本文を `MAIN_CONTENTS`(wysiwyg-data) に移植、Googleフォント追加読み込み確認
