/* ============================================================
   らくうるカート 取引ページ 挙動再現スクリプト（ローカル専用）
   ------------------------------------------------------------
   本番では会員・カート・注文はサーバー(cart.raku-uru.jp)が
   セッション/DBで管理する。ローカルでは localStorage を用いて
   同等の挙動（カート投入→レジ→注文→履歴、会員登録→ログイン→
   マイページ）を再現する。移行時はこの層をサーバーAPIに置換する。
   ============================================================ */
(function () {
  "use strict";

  // 本番の店舗ハッシュ（URL: /cart/{SHOP_HASH} 等）。ローカルでは経路の記録用。
  var SHOP_HASH = "47409ca9deadd2be6543f3c2fc49d40f";

  var KEY_CART = "hokudai_cart";
  var KEY_MEMBER = "hokudai_member";     // 登録済み会員（デモは1件）
  var KEY_SESSION = "hokudai_session";   // ログイン中の会員ID
  var KEY_ORDERS = "hokudai_orders";     // 注文履歴
  var KEY_REGTMP = "hokudai_regist_tmp"; // 登録 入力→確認 の一時保持(sessionStorage)

  /* 送料は「全国一律」ではない。配送先の地域 × 荷物のサイズ区分で決まる（送料無料の閾値は無し）。
   * 本番でも送料は注文時点では未確定（配送先・サイズ確定後に決まる）。
   * 出典: https://hokudai-goods-seikyou.net/fee （ヤマト運輸・常温）。単位：円。
   * サイズ区分キー: "60-80" / "100-120" / "140-160" */
  var SHIP_REGIONS = [
    { name: "北海道", fee: { "60-80": 880, "100-120": 1300, "140-160": 1690 }, prefs: ["北海道"] },
    { name: "北東北", fee: { "60-80": 1100, "100-120": 1490, "140-160": 1870 }, prefs: ["青森県", "秋田県", "岩手県"] },
    { name: "南東北", fee: { "60-80": 1210, "100-120": 1580, "140-160": 1960 }, prefs: ["宮城県", "山形県", "福島県"] },
    { name: "関東", fee: { "60-80": 1290, "100-120": 1670, "140-160": 2050 }, prefs: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "神奈川県", "山梨県", "東京都"] },
    { name: "信越", fee: { "60-80": 1290, "100-120": 1670, "140-160": 2050 }, prefs: ["新潟県", "長野県"] },
    { name: "北陸", fee: { "60-80": 1380, "100-120": 1760, "140-160": 2150 }, prefs: ["富山県", "石川県", "福井県"] },
    { name: "中部", fee: { "60-80": 1380, "100-120": 1760, "140-160": 2150 }, prefs: ["静岡県", "愛知県", "三重県", "岐阜県"] },
    { name: "関西", fee: { "60-80": 1560, "100-120": 1950, "140-160": 2420 }, prefs: ["大阪府", "京都府", "滋賀県", "奈良県", "和歌山県", "兵庫県"] },
    { name: "中国", fee: { "60-80": 1650, "100-120": 2040, "140-160": 2420 }, prefs: ["岡山県", "広島県", "山口県", "鳥取県", "島根県"] },
    { name: "四国", fee: { "60-80": 1650, "100-120": 2040, "140-160": 2420 }, prefs: ["香川県", "徳島県", "愛媛県", "高知県"] },
    { name: "九州", fee: { "60-80": 1980, "100-120": 2440, "140-160": 2900 }, prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"] },
    { name: "沖縄", fee: { "60-80": 2530, "100-120": 3200, "140-160": 4220 }, prefs: ["沖縄県"] }
  ];

  // 都道府県 → 地域 の逆引き（初期化時に構築）
  var PREF_TO_REGION = {};
  for (var _ri = 0; _ri < SHIP_REGIONS.length; _ri++) {
    var _rg = SHIP_REGIONS[_ri];
    for (var _pi = 0; _pi < _rg.prefs.length; _pi++) { PREF_TO_REGION[_rg.prefs[_pi]] = _rg; }
  }

  /* 配送先(都道府県)とサイズ区分から送料を引く。未指定・不明なら null（＝未確定）。 */
  function shipFeeFor(pref, size) {
    var rg = PREF_TO_REGION[pref];
    if (!rg) return null;
    return rg.fee[size || "60-80"]; // サイズ未指定時は最小区分(60-80)を既定
  }

  /* ---------- storage helpers ---------- */
  function readJSON(store, key, def) {
    try { var v = store.getItem(key); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  }
  function writeJSON(store, key, val) { store.setItem(key, JSON.stringify(val)); }

  /* ---------- format ---------- */
  function yen(n) { return "¥" + Number(n || 0).toLocaleString("ja-JP"); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "/" + pad2(d.getMonth() + 1) + "/" + pad2(d.getDate());
  }
  function orderNo() {
    // 受注番号（日付 + 連番風）
    var d = new Date();
    var base = "" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    var seq = ("000" + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds())).slice(-5);
    return base + "-" + seq;
  }

  /* ---------- cart ---------- */
  function getCart() { return readJSON(localStorage, KEY_CART, []); }
  function saveCart(items) { writeJSON(localStorage, KEY_CART, items); updateHeaderCount(); }
  function cartCount() {
    return getCart().reduce(function (s, it) { return s + Number(it.qty || 0); }, 0);
  }
  function addToCart(item) {
    // item: {itemId, name, price, qty, imageUrl, itemCode}
    var items = getCart();
    var found = null;
    for (var i = 0; i < items.length; i++) { if (items[i].itemId === item.itemId) { found = items[i]; break; } }
    if (found) { found.qty = Number(found.qty) + Number(item.qty || 1); }
    else {
      items.push({
        itemId: String(item.itemId), name: item.name || "", price: Number(item.price || 0),
        qty: Number(item.qty || 1), imageUrl: item.imageUrl || "", itemCode: item.itemCode || ""
      });
    }
    saveCart(items);
    return items;
  }
  function updateQty(itemId, qty) {
    var items = getCart();
    for (var i = 0; i < items.length; i++) {
      if (items[i].itemId === itemId) { items[i].qty = Math.max(1, Number(qty) || 1); break; }
    }
    saveCart(items);
    return items;
  }
  function removeItem(itemId) {
    var items = getCart().filter(function (it) { return it.itemId !== itemId; });
    saveCart(items);
    return items;
  }
  function clearCart() { saveCart([]); }
  /* カートの金額。送料は配送先・サイズ確定後に決まるため、この時点では未確定（=null）。
   * 合計は「送料別」の商品合計。配送先(pref)を渡すと、その地域の送料(最小サイズ区分)を試算して含める。 */
  function cartTotals(pref, size) {
    var items = getCart();
    var itemTotal = items.reduce(function (s, it) { return s + Number(it.price) * Number(it.qty); }, 0);
    var ship = pref ? shipFeeFor(pref, size) : null; // 配送先未指定なら未確定
    var total = itemTotal + (typeof ship === "number" ? ship : 0);
    return { itemTotal: itemTotal, ship: ship, total: total };
  }

  /* ---------- member / session ---------- */
  function getMember() { return readJSON(localStorage, KEY_MEMBER, null); }
  function saveMember(m) { writeJSON(localStorage, KEY_MEMBER, m); }
  function isLoggedIn() { return !!localStorage.getItem(KEY_SESSION); }
  function currentMember() {
    var id = localStorage.getItem(KEY_SESSION);
    var m = getMember();
    return (id && m && m.memberId === id) ? m : null;
  }
  function login(id, pw) {
    var m = getMember();
    if (m && m.memberId === id && m.password === pw) {
      localStorage.setItem(KEY_SESSION, id);
      return true;
    }
    return false;
  }
  function logout() { localStorage.removeItem(KEY_SESSION); }

  /* ---------- registration temp (input→confirm) ---------- */
  function setRegTmp(data) { writeJSON(sessionStorage, KEY_REGTMP, data); }
  function getRegTmp() { return readJSON(sessionStorage, KEY_REGTMP, null); }
  function clearRegTmp() { sessionStorage.removeItem(KEY_REGTMP); }

  /* ---------- orders ---------- */
  function getOrders() { return readJSON(localStorage, KEY_ORDERS, []); }
  function createOrder() {
    var items = getCart();
    if (!items.length) return null;
    var t = cartTotals();
    var order = {
      no: orderNo(), date: todayStr(),
      items: items.map(function (it) { return { name: it.name, price: it.price, qty: it.qty, imageUrl: it.imageUrl }; }),
      itemTotal: t.itemTotal, ship: t.ship, total: t.total,
      status: "ご注文受付"
    };
    var orders = getOrders();
    orders.unshift(order);
    writeJSON(localStorage, KEY_ORDERS, orders);
    clearCart();
    return order;
  }

  /* ---------- header cart count ---------- */
  function updateHeaderCount() {
    var els = document.querySelectorAll("[data-cart-count]");
    var c = cartCount();
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = c > 0 ? "(" + c + ")" : "";
    }
  }

  /* ---------- 都道府県 ---------- */
  var PREFECTURES = [
    "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県",
    "埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県",
    "岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
    "鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県",
    "佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"
  ];

  window.TX = {
    SHOP_HASH: SHOP_HASH,
    yen: yen, esc: esc, todayStr: todayStr,
    // cart
    getCart: getCart, addToCart: addToCart, updateQty: updateQty, removeItem: removeItem,
    clearCart: clearCart, cartCount: cartCount, cartTotals: cartTotals,
    // shipping（地域別送料）
    shipFeeFor: shipFeeFor, SHIP_REGIONS: SHIP_REGIONS,
    // member
    getMember: getMember, saveMember: saveMember, isLoggedIn: isLoggedIn,
    currentMember: currentMember, login: login, logout: logout,
    // reg temp
    setRegTmp: setRegTmp, getRegTmp: getRegTmp, clearRegTmp: clearRegTmp,
    // orders
    getOrders: getOrders, createOrder: createOrder,
    // ui
    updateHeaderCount: updateHeaderCount,
    PREFECTURES: PREFECTURES
  };

  if (document.readyState !== "loading") updateHeaderCount();
  else document.addEventListener("DOMContentLoaded", updateHeaderCount);
})();
