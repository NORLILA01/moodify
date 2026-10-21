/* Aggression detector, JavaScript port of train.py's model (TF-IDF 1-2 grams + logistic regression).
 * Works in the browser (global `AggressionDetector`) and in Node (`require`).
 * normalize() must stay in step with normalize() in train.py. */
(function (root) {
  "use strict";

  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "$": "s", "@": "a" };

  function normalize(text) {
    var t = String(text).toLowerCase();
    t = t.replace(/https?:\/\/\S+/g, " ");
    t = t.replace(/[013457$@]/g, function (c) { return LEET[c]; });
    t = t.replace(/[^a-z\s]/g, " ");
    t = t.replace(/(.)\1{2,}/g, "$1$1");
    t = t.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, function (m) { return m.replace(/ /g, ""); });
    return t.replace(/\s+/g, " ").trim();
  }

  function create(model) {
    var index = new Map();
    for (var i = 0; i < model.terms.length; i++) index.set(model.terms[i], i);

    // sklearn's token_pattern (?u)\b\w\w+\b on normalized text == runs of 2+ letters
    function tokens(t) { return t.match(/[a-z]{2,}/g) || []; }

    function score(text) {
      var toks = tokens(normalize(text));
      var counts = new Map();
      function add(term) {
        var j = index.get(term);
        if (j !== undefined) counts.set(j, (counts.get(j) || 0) + 1);
      }
      for (var k = 0; k < toks.length; k++) {
        add(toks[k]);
        if (k + 1 < toks.length) add(toks[k] + " " + toks[k + 1]);
      }
      var weights = [], sq = 0;
      counts.forEach(function (tf, j) {
        var w = (1 + Math.log(tf)) * model.idf[j];   // sublinear_tf
        weights.push([j, w]);
        sq += w * w;
      });
      var norm = Math.sqrt(sq) || 1, z = model.intercept;
      for (var m = 0; m < weights.length; m++) z += (weights[m][1] / norm) * model.coef[weights[m][0]];
      return 1 / (1 + Math.exp(-z));
    }

    return {
      threshold: model.threshold,
      score: score,
      // band: "ok" | "borderline" | "block"; borderline is where an LLM second opinion belongs
      check: function (text, borderlineFrom) {
        var p = score(text), lo = borderlineFrom == null ? 0.4 : borderlineFrom;
        return { prob: p, band: p >= model.threshold ? "block" : p >= lo ? "borderline" : "ok" };
      },
    };
  }

  var api = { create: create, normalize: normalize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AggressionDetector = api;
})(typeof self !== "undefined" ? self : this);
