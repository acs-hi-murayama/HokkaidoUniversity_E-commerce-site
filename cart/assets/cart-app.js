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

  // 送料ルール（ローカル近似）：全国一律 ¥660、税込5,500円以上で無料
  var SHIP_FEE = 660;
  var SHIP_FREE_THRESHOLD = 5500;

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
  function cartTotals() {
    var items = getCart();
    var itemTotal = items.reduce(function (s, it) { return s + Number(it.price) * Number(it.qty); }, 0);
    var ship = itemTotal === 0 ? 0 : (itemTotal >= SHIP_FREE_THRESHOLD ? 0 : SHIP_FEE);
    return { itemTotal: itemTotal, ship: ship, total: itemTotal + ship, freeThreshold: SHIP_FREE_THRESHOLD };
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
