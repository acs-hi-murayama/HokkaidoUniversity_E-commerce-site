# 本番移行メモ（自動生成）

`production-build/` は本番参照へ機械変換したコピーです。以下は**手動で仕上げる項目**。
詳細な対応表は `.claude/skills/build-production/SKILL.md` と `ARCHITECTURE.md` を参照。

## 共通
- ヘッダ/フッタは本番では `Common_Part.html` に集約（各ページは MAIN_CONTENTS のみ）。
- 商品データ `data/products.json` は管理画面へ商品登録（本番は `{% for item in itemList %}` が描画）。
- `data/main-visual.html` `top-message1/2.html` は管理画面のデザイン設定へ登録。
- `js/shop.js` `cart/assets/cart-app.js` はローカル専用。本番へは持ち込まない。

## ファイル別

### index.html
- shop.js を除去済み。商品カード/一覧/詳細のJS描画を Twig ループへ手動変換すること。
- トップ差し込み（main-visual / top-message1 / top-message2）を {{ dsnTopHtmlTag }} / {{ dsnTopDesc1Shop }} / {{ dsnTopDesc2Shop }} へ手動置換すること。
- slickカルーセルは本番テーマの実装に合わせて確認すること。
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### product-list.html
- shop.js を除去済み。商品カード/一覧/詳細のJS描画を Twig ループへ手動変換すること。
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### product-details.html
- shop.js を除去済み。商品カード/一覧/詳細のJS描画を Twig ループへ手動変換すること。
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### search.html
- shop.js を除去済み。商品カード/一覧/詳細のJS描画を Twig ループへ手動変換すること。
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### 404.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### members-only-login.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### common-id-login.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### fr/1.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### fr/2.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### fr/3.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### fr/_template.html
- ヘッダ/フッタは本番では Common_Part.html に集約。各ページは MAIN_CONTENTS 部分のみに整理すること。

### cart/cart/index.html
- フォーム action は本番パスのまま。ローカルのJS送信ハンドラは削除し、通常POST（サーバー処理）に戻すこと。
- 画面別JS（例 /resources/js/mem/mem0001d01.js）は本番が自動付与。必要に応じ確認。

### cart/member/regist/input/index.html
- フォーム action は本番パスのまま。ローカルのJS送信ハンドラは削除し、通常POST（サーバー処理）に戻すこと。
- 画面別JS（例 /resources/js/mem/mem0001d01.js）は本番が自動付与。必要に応じ確認。

### cart/member/regist/confirm/index.html
- フォーム action は本番パスのまま。ローカルのJS送信ハンドラは削除し、通常POST（サーバー処理）に戻すこと。
- 画面別JS（例 /resources/js/mem/mem0001d01.js）は本番が自動付与。必要に応じ確認。

### cart/member/regist/complete/index.html
- フォーム action は本番パスのまま。ローカルのJS送信ハンドラは削除し、通常POST（サーバー処理）に戻すこと。
- 画面別JS（例 /resources/js/mem/mem0001d01.js）は本番が自動付与。必要に応じ確認。

### cart/mypage/login/index.html
- フォーム action は本番パスのまま。ローカルのJS送信ハンドラは削除し、通常POST（サーバー処理）に戻すこと。
- 画面別JS（例 /resources/js/mem/mem0001d01.js）は本番が自動付与。必要に応じ確認。

### cart/mypage/index.html
- フォーム action は本番パスのまま。ローカルのJS送信ハンドラは削除し、通常POST（サーバー処理）に戻すこと。
- 画面別JS（例 /resources/js/mem/mem0001d01.js）は本番が自動付与。必要に応じ確認。
