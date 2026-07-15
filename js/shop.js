/* 北海道大学オンラインショップ ローカルプレビュー用 商品描画スクリプト
 *
 * data/products.json（らくうるカートの商品CSVから生成）を読み込み、
 * 一覧・検索・詳細・トップページの商品を描画する。
 *
 * ※ローカル確認専用。本番（らくうるカート）ではサーバー側が
 *   {% for item in itemList %} 等で同等のデータを描画するため、この JS は移行対象外。
 */
(function () {
  "use strict";

  var DATA_URL = "./data/products.json";
  var _cache = null;

  /* カテゴリーマスター（categoryId → 表示名）。
   * 本番（らくうるカート）ではカテゴリーもサーバー側から供給されるが、
   * ローカルでは products.json の categoryId とナビの表示名を突き合わせる。 */
  var CATEGORIES = {
    "CG-00004": "ウェア",
    "CG-00001": "食品",
    "CG-00002": "酒類",
    "CG-00003": "文具",
    "CG-00019": "小物",
    "CG-00017": "生活雑貨",
    "CG-00016": "革製品グッズ",
    "CG-00018": "ガラスジュエリー",
    "CG-00015": "寮歌CD",
    "CG-00008": "その他",
    "CG-00007": "おしょろ丸グッズ",
    "CG-00014": "ミズナラグッズ"
  };

  function categoryName(id) {
    return CATEGORIES[id] || null;
  }

  function load() {
    if (_cache) return Promise.resolve(_cache);
    return fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("products.json の読み込みに失敗: " + r.status);
        return r.json();
      })
      .then(function (data) { _cache = data; return data; });
  }

  function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function detailUrl(p) { return "./product-details?id=" + encodeURIComponent(p.itemId); }

  function isPublished(p) { return p.published === "1" && p.active === "1"; }
  function published(list) { return list.filter(isPublished); }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].itemId === id) return list[i];
    }
    return null;
  }

  function param(name) {
    try { return new URLSearchParams(location.search).get(name); }
    catch (e) { return null; }
  }

  /* 一覧・新着・検索用の商品カード */
  function card(p) {
    var u = detailUrl(p), n = esc(p.name);
    return '<li>' +
      '<div class="item-photo product-list-photo">' +
        '<a href="' + u + '"><img src="' + esc(p.imageUrl) + '" alt="' + n + '"></a>' +
      '</div>' +
      '<div class="item-info">' +
        '<p class="item-name"><a href="' + u + '">' + n + '</a></p>' +
        '<p class="item-price">' + yen(p.price) + '<span class="tax">（税込）</span></p>' +
      '</div>' +
    '</li>';
  }

  /* ランキング・おすすめ用（順位バッジ付き） */
  function rankCard(p, i) {
    var u = detailUrl(p), n = esc(p.name), r = i + 1;
    return '<li>' +
      '<div class="item-photo">' +
        '<div class="icon-rank rank' + r + '"><span>' + r + '</span></div>' +
        '<a href="' + u + '"><img src="' + esc(p.imageUrl) + '" alt="' + n + '"></a>' +
      '</div>' +
      '<div class="item-info">' +
        '<p class="item-name"><a href="' + u + '">' + n + '</a></p>' +
        '<p class="item-price">' + yen(p.price) + '<span class="tax">（税込）</span></p>' +
      '</div>' +
    '</li>';
  }

  function fill(sel, html) {
    var el = document.querySelector(sel);
    if (el) el.innerHTML = html;
  }

  /* 外部HTMLファイルを取得して要素に注入する。
   * 本番（らくうるカート）で {{ dsnTopDesc1Shop }} 等をサーバーが差し込むのと同じ役割。
   * ローカルでは data/top-message1.html などの「別ファイル」を index.html に埋め込む。 */
  function include(sel, url) {
    var el = document.querySelector(sel);
    if (!el) return Promise.resolve(null);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(url + " の読み込みに失敗: " + r.status);
        return r.text();
      })
      .then(function (html) { el.innerHTML = html; return el; });
  }

  window.Shop = {
    load: load,
    yen: yen,
    esc: esc,
    detailUrl: detailUrl,
    published: published,
    byId: byId,
    param: param,
    card: card,
    rankCard: rankCard,
    fill: fill,
    include: include,
    categories: CATEGORIES,
    categoryName: categoryName
  };
})();
