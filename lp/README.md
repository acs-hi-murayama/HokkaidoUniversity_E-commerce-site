# lp/ — ランディングページ（LP）

らくうるカートの「LP設定」に相当するフォルダ。**1 LP = 1 フォルダ**で格納する（`lp/【LP名】/`）。

## フォルダ構成のルール

各LPは自分のフォルダを持ち、その中に本体 `index.html` とバナー等の素材を同梱する。

```
lp/
├── lp-bear/            … ぬいぐるみLP
│   ├── index.html
│   └── lp_sample1.png  （バナー）
├── lp-beer/            … クラフトビールLP
│   ├── index.html
│   └── lp_sample2.png  （バナー）
└── lp-sanrio/          … サンリオコラボLP（Claude Design製）
    ├── index.html
    ├── support.js / img/ …
    └── sanrio_banner.png
```

- URL は `/lp/【LP名】/`（フォルダ内 `index.html` が開く）。
- **必ず末尾スラッシュ付きでリンクすること**（`/lp/lp-bear/`）。
  スラッシュ無しだと `./バナー.png` などの相対参照が親フォルダ基準で解決され画像が壊れる
  （開発サーバーのクリーンURL挙動のため）。
- 2階層深くなるため、サイト共通リソースへの参照は `../../css/` `../../index.html` … となる。

## 新しいLPの作り方

1. `lp/【LP名】/` フォルダを作る。
2. `_template.html` をコピーして `lp/【LP名】/index.html` として置く。
3. ファイル内の以下を書き換える。
   - `__PAGE_TITLE__` … LPタイトル
   - `__PAGE_BODY__` … LP本文HTML（`wysiwyg-data` の中身）
   - 共通リソースの参照を `../../`（2階層上）に直す（テンプレは `../` なので注意）。
   - 必要に応じて `<style>` にLP専用スタイルを追記。
4. バナー画像を同フォルダに置く。
5. トップページ [../index.html](../index.html) のキービジュアルスライダーに
   `<a href="./lp/【LP名】/"><img src="./lp/【LP名】/バナー.png" ...></a>` を1スライド追加する。

## 現在のページ

| フォルダ | 内容 | 種別 | バナー |
|---|---|---|---|
| lp-bear/ | 「北大オリジナル ぬいぐるみコレクション」LP | 静的HTML | lp_sample1.png |
| lp-beer/ | 「北大限定クラフトビール」LP | 静的HTML | lp_sample2.png |
| lp-sanrio/ | 「北大 × サンリオ コラボ クリアファイル」LP | Claude Design（dcランタイム） | sanrio_banner.png |
| landing-page.html | 「北大公式グッズ 期間限定フェア」サンプルLP（旧・単一ファイル形式） | 静的HTML（テンプレート由来） | — |

### lp-sanrio/（Claude Design 製LP）

- URL：`/lp/lp-sanrio/`（**必ず末尾スラッシュ付きでリンクすること**）
  - 末尾スラッシュが無い（`/lp/lp-sanrio`）と、相対参照の `./support.js` や `img/` が
    親フォルダ基準で解決されて画像・動作が壊れる（開発サーバーのクリーンURL挙動のため）。
- トップページ [../index.html](../index.html) から `sanrio_banner.png` バナーで導線を設置済み。
- 構成ファイル：
  - `index.html` … LP本体（Claude Design 書き出しの `.dc.html` をリネーム）
  - `support.js` … Claude Design ランタイム（`<sc-for>`/`<sc-if>`・`{{ }}`・数量ボタン等を描画）。**削除不可**
  - `img/*.jpg` … 商品画像（正門/並木/クラーク像/セット）
  - `sanrio_banner.png` … トップ掲載用バナー
  - `北大サンリオコラボLP制作 (5).zip` … 元プロジェクト一式（表示には不要。保管用）

#### ⚠ らくうるカート移行時の注意
このLPは `support.js`（リアクティブ・ランタイム）に依存しており、`<sc-for>`/`{{ }}` などは
そのままではカートの「自由記述（wysiwyg）」に貼れない。移行時は **静的HTML/CSSへ平坦化**
（ループ展開・バインディング値の固定・数量/カート動作を素のJSに置換）する作業が別途必要。
ローカルでは現状のまま完全再現で表示・確認できる。

## 本番移行時のメモ

- `wysiwyg-data` の中身（本文）だけをカートのLP「自由記述」に貼り付ける。
- ヘッダ/フッタはカート側の `Landing_Page.html` が付与するので、移行時は本文のみでよい。
- LP内の画像は本番でも実URL直書き。`picsum.photos` の仮画像を実URLに差し替えること。
- LP専用の `<style>` は、本番では「HEADER_CUSTOM_CONTENTS」に相当する箇所へ移す。
- 詳細は [../MAPPING.md](../MAPPING.md) を参照。
