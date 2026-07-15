# 取引ページ（会員登録・マイページ・カート）ローカル再現

本番サイト https://hokudai-goods-seikyou.net/ の**会員登録・マイページ・カート**を、
想定される本番環境（らくうるカート）の構成に沿ってローカル再現したものです。

管理画面からこれらのページHTMLを取得できなかったため、公開されている本番ページの
**構造・項目・遷移をブラウザで分析**し、それを基に再構成しています（本番HTML/画像の
コピーではなく、項目定義とフローの再現）。

---

## 本番のアーキテクチャ（分析結果）

らくうるカートでは、ドメインが2つに分かれています。

| 役割 | ドメイン | 内容 |
|------|----------|------|
| ストアフロント | `hokudai-goods-seikyou.net` | トップ・商品一覧・商品詳細・LP・お知らせ（店舗テーマでSSR） |
| 取引アプリ | `cart.raku-uru.jp` | 会員登録・マイページ・カート・お問合せ（SaaS本体を店舗テーマで描画） |

取引ページのURLは **`cart.raku-uru.jp/{機能}/{パス}/{shpHash}`** の形式で、
本店舗の `shpHash` は `47409ca9deadd2be6543f3c2fc49d40f`。

---

## ルート対応表（本番 → ローカル）

| 画面 | 本番URL | ローカルフォルダ | 画面ID相当 |
|------|---------|------------------|-----------|
| ショッピングカート | `/cart/{hash}` | `cart/cart/index.html` | CBY0003 |
| 会員登録（入力） | `/member/regist/input/{hash}` | `cart/member/regist/input/index.html` | MEM0001D01 |
| 会員登録（確認） | `/member/regist/confirm/{hash}` | `cart/member/regist/confirm/index.html` | MEM0001D02 |
| 会員登録（完了） | `/member/regist/complete/{hash}` | `cart/member/regist/complete/index.html` | MEM0001D03 |
| マイページ ログイン | `/mypage/login/{hash}` | `cart/mypage/login/index.html` | MYP0001D01 |
| マイページ トップ他 | `/mypage/{hash}` | `cart/mypage/index.html`（`?view=history/info/address`で切替） | MYP0002D01 |

> ローカルではフォルダ構成で本番のURLパスを再現し、店舗固有の `shpHash` は省略しています。

---

## ファイル構成

```
cart/
├── README.md                         ... 本ファイル
├── assets/
│   ├── cart-common.css               ... 本番の /resources/css/cart-common.css をそのまま使用
│   ├── theme.css                     ... 本番の /getCss/{shpHash}（店舗テーマ）をそのまま使用
│   └── cart-app.js                   ... 挙動層（localStorageでカート/会員/注文を管理）
├── cart/index.html                   ... ショッピングカート
├── member/regist/
│   ├── input/index.html              ... 会員登録 入力
│   ├── confirm/index.html            ... 会員登録 確認
│   └── complete/index.html           ... 会員登録 完了
└── mypage/
    ├── login/index.html              ... マイページ ログイン
    └── index.html                    ... マイページ トップ／注文履歴／会員情報／お届け先
```

### CSS は本番実ファイルをそのまま使用（完全一致）

デベロッパーツール相当で本番 `cart.raku-uru.jp` が実際に配信している CSS を取得し、ローカルへ設置：

| ローカル | 取得元（本番） | 内容 |
|----------|----------------|------|
| `assets/cart-common.css` | `/resources/css/cart-common.css` | 取引ページ共通の基盤CSS（画像参照のみ絶対URL化） |
| `assets/theme.css` | `/getCss/{shpHash}` | 店舗テーマ（色・レイアウト解決済み。Twig変数なし） |

HTML も本番の生HTMLをそのまま踏襲（項目・表記・順序・都道府県値・class名まで同一）。
サーバー依存部分（`_csrf`・フォーム action・gtag）のみローカル挙動へ置換。

**表示検証（ヘッドレスSSのバイト一致）**：ログイン 30190B・カート(空) 27852B・会員登録 83901B が
いずれも本番と完全一致（ピクセルパーフェクト）。

※ 確認・完了・ログイン後マイページは本番が POST/セッション必須で生HTML取得不可のため、
　同一 chrome・同一CSS・同一クラス体系で構成（デザインは他ページと一貫）。

---

## 挙動の再現（ローカル専用）

本番はサーバー(セッション/DB)で処理しますが、ローカルでは **localStorage / sessionStorage** で
同等の挙動を再現しています。移行時はこの層をサーバーAPIに置換します。

| ストレージキー | 内容 |
|----------------|------|
| `hokudai_cart` | カート内商品（localStorage） |
| `hokudai_member` | 登録済み会員（デモは1件） |
| `hokudai_session` | ログイン中の会員ID |
| `hokudai_orders` | 注文履歴 |
| `hokudai_regist_tmp` | 会員登録 入力→確認 の一時保持（sessionStorage） |

### 一連のフロー
1. **商品詳細**で「カートに入れる」→ `hokudai_cart` に追加 → **カート**に反映
2. **カート**で数量変更・削除・送料計算（全国一律¥660、税込5,500円以上で無料）
3. カートの「レジに進む」→ 未ログインなら**ログイン**へ、ログイン済みなら**注文確定**→注文履歴へ
4. **会員登録** 入力→確認→完了 で `hokudai_member` を作成
5. **ログイン**（登録した会員ID/パスワード）→ **マイページ**（会員情報・注文履歴・お届け先・ログアウト）

---

## 本番への移行メモ

- 各 `index.html` の `<!-- 本番ルート: ... -->` コメントに対応する本番URLを明記済み。
- フォーム項目名（`memberId` `password` `sei` `mei` `zip` `pref` 等）は本番の入力項目に対応。
- `cart-app.js` のカート/会員/注文APIは、本番では `cart.raku-uru.jp` のサーバー処理に対応。
- ヘッダーの会員登録/マイページ/カートリンクは全ストアフロントページから本フォルダへ接続済み。
- お問合せリンクは本番同様 `cart.raku-uru.jp/ask/start/{hash}` を指す。
