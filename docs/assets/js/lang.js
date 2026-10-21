/* Language runtime shared by the site and the presentation.
   - Default language is Bahasa Melayu on a first visit; the stored choice ("ms" | "en") is restored later.
   - Only the language code is stored in localStorage. If storage is blocked, switching still works in memory.
   - Static text is filled from TBYS_I18N via data-i18n / data-i18n-attr; no innerHTML is used. */
(function (root) {
  "use strict";
  var KEY = "tbys-lang";
  var DEFAULT = "ms";
  var dict = root.TBYS_I18N;
  var doc = root.document;
  var current = DEFAULT;
  var listeners = [];
  var memoryOnly = false;

  function stored() {
    try {
      var v = root.localStorage.getItem(KEY);
      return v === "ms" || v === "en" ? v : null;
    } catch (e) { memoryOnly = true; return null; }
  }
  function persist(v) {
    try { root.localStorage.setItem(KEY, v); } catch (e) { memoryOnly = true; }
  }

  function interpolate(s, params) {
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return params[k] !== undefined ? String(params[k]) : m; });
  }
  function t(key, params) {
    var s = dict[current][key];
    if (s === undefined) s = dict.en[key];
    if (s === undefined) return key;
    return interpolate(s, params);
  }

  // **bold** and *italic* become <strong> and <em>; everything else is plain text.
  function rich(el, str) {
    while (el.firstChild) el.removeChild(el.firstChild);
    String(str).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach(function (part) {
      if (!part) return;
      var m;
      if ((m = /^\*\*([^*]+)\*\*$/.exec(part))) { var b = doc.createElement("strong"); b.textContent = m[1]; el.appendChild(b); }
      else if ((m = /^\*([^*]+)\*$/.exec(part))) { var i = doc.createElement("em"); i.textContent = m[1]; el.appendChild(i); }
      else el.appendChild(doc.createTextNode(part));
    });
  }

  function applyStatic(scope) {
    var root_ = scope || doc;
    var nodes = root_.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var text = t(n.getAttribute("data-i18n"));
      rich(n, text);
      if (n.hasAttribute("data-i18n-hide-empty")) n.hidden = text === "";
    }
    var attrs = root_.querySelectorAll("[data-i18n-attr]");
    for (var j = 0; j < attrs.length; j++) {
      attrs[j].getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) attrs[j].setAttribute(p[0].trim(), t(p[1].trim()));
      });
    }
    if (!scope) {
      doc.documentElement.setAttribute("lang", current === "ms" ? "ms-MY" : "en");
      var tk = doc.documentElement.getAttribute("data-title-key");
      if (tk) doc.title = t(tk);
      var btns = doc.querySelectorAll("[data-set-lang]");
      for (var k = 0; k < btns.length; k++) {
        btns[k].setAttribute("aria-pressed", btns[k].getAttribute("data-set-lang") === current ? "true" : "false");
      }
    }
  }

  function set(lang, opts) {
    if (lang !== "ms" && lang !== "en") return;
    var changed = lang !== current;
    current = lang;
    persist(lang);
    applyStatic();
    if (changed) {
      listeners.forEach(function (fn) { try { fn(lang); } catch (e) { /* a listener must not break switching */ } });
      var live = doc.getElementById("lang-live");
      if (live && !(opts && opts.silent)) live.textContent = t(lang === "ms" ? "status.lang.ms" : "status.lang.en");
    }
  }

  function init() {
    current = stored() || DEFAULT;
    applyStatic();
    var btns = doc.querySelectorAll("[data-set-lang]");
    for (var i = 0; i < btns.length; i++) {
      (function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-set-lang")); }); })(btns[i]);
    }
  }

  root.TBYS_LANG = {
    get: function () { return current; },
    set: set,
    t: t,
    rich: rich,
    applyStatic: applyStatic,
    onChange: function (fn) { listeners.push(fn); },
    isMemoryOnly: function () { return memoryOnly; },
    init: init
  };
})(typeof self !== "undefined" ? self : this);
