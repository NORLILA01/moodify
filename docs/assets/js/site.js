/* Think Before You Send: page behaviour.
   - Draft checking runs locally with detector.js + model.json.
   - AI coaching is requested only by an explicit button click and goes to the Worker below.
   - The only thing persisted is the display-language code (see lang.js). No drafts, no analytics.
   - All visible strings come from TBYS_I18N via t(); dynamic regions are rebuilt from `state`
     when the language changes, so drafts, reflections, results and AI replies are kept. */
(function () {
  "use strict";

  var L = window.TBYS_LANG;
  var t = L.t;

  var WORKER_URL = "https://moodify.norlilachngwork.workers.dev";
  var MAX = 500;
  // English wording kept for the detector-side check; the support message itself is translated.
  var SELF_HARM = /\b(kill(ing)? myself|end(ing)? my life|want to die|wanna die|suicid\w*|don'?t want to (live|be here|exist)|better off dead)\b/i;
  var TIP_KEYS = ["tip.1", "tip.2", "tip.3", "tip.4"];
  var EXAMPLES = 2;

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var draft = $("draft"), count = $("count"), checkBtn = $("check"), statusEl = $("status"),
      result = $("result"), draftError = $("draft-error"),
      reflect = $("reflect"), reflection = $("reflection"),
      writeRevisionBtn = $("write-revision"), resetBtn = $("reset"),
      revWrap = $("revision-wrap"), revision = $("revision"), revCount = $("revision-count"),
      revError = $("revision-error"), checkRevBtn = $("check-revision"), revResult = $("revision-result");

  var state = {
    detector: null,
    model: "loading",      // "loading" | "ready" | "error"
    rev: 0,                // bumps on every check, edit-after-check and reset
    checked: null,         // { text, kind, rev } for the draft the visible result belongs to
    original: null,        // { text, kind } snapshot for the original/revision comparison
    controller: null,      // AbortController of the in-flight coaching request
    ai: { phase: "idle", data: null, status: 0, lang: null },
    statusKey: "status.loading",
    draftErr: null,        // translation key or null
    revErr: null,
    revResult: null,       // { text, kind, orig: { text, kind } }
    exIndex: 0
  };

  // ---------- small helpers ----------
  function assess(text) {
    if (SELF_HARM.test(text)) return { kind: "support" };
    return { kind: state.detector.check(text).band };    // "ok" | "borderline" | "block"
  }
  function updateCount(input, out) { out.textContent = input.value.length + " / " + MAX; }
  function cancelPending() {
    if (state.controller) { state.controller.abort(); state.controller = null; }
  }
  function aiReset() { state.ai = { phase: "idle", data: null, status: 0, lang: null }; }
  function setStatus(key) { state.statusKey = key; renderStatus(); }

  // ---------- rendering (pure functions of state + current language) ----------
  function renderStatus() { statusEl.textContent = state.statusKey ? t(state.statusKey) : ""; }

  function renderField(errEl, input, key) {
    if (key) { errEl.textContent = t(key); errEl.hidden = false; input.setAttribute("aria-invalid", "true"); }
    else { errEl.textContent = ""; errEl.hidden = true; input.removeAttribute("aria-invalid"); }
  }

  function panel(kind, tagKey, titleKey) {
    var p = el("div", "panel panel--" + kind);
    if (tagKey) p.appendChild(el("span", "tag", t(tagKey)));
    p.appendChild(el("h3", null, t(titleKey)));
    return p;
  }
  function tipsList() {
    var ul = el("ul");
    TIP_KEYS.forEach(function (k) { ul.appendChild(el("li", null, t(k))); });
    return ul;
  }
  function supportPanel() {
    var p = panel("warn", "support.tag", "support.title");
    p.appendChild(el("p", null, t("support.p1")));
    p.appendChild(el("p", null, t("support.p2")));
    return p;
  }
  function suggestions(data, requestedLang) {
    var out = el("div");
    out.appendChild(el("h4", null, t("coach.title")));
    if (data.aggressive === false) out.appendChild(el("p", null, t("coach.direct")));
    var dl = el("dl", "suggestion");
    [["coach.l.feeling", data.feeling], ["coach.l.impact", data.impact], ["coach.l.tip", data.tip]].forEach(function (kv) {
      if (!kv[1]) return;
      dl.appendChild(el("dt", null, t(kv[0])));
      dl.appendChild(el("dd", null, kv[1]));      // model text: always textContent
    });
    if (data.starter) {
      dl.appendChild(el("dt", null, t("coach.l.starter")));
      dl.appendChild(el("dd", "starter", "“" + data.starter + " …”"));
    }
    out.appendChild(dl);
    if (requestedLang && requestedLang !== L.get()) {
      out.appendChild(el("p", "field-hint", t(requestedLang === "en" ? "coach.langnote.en" : "coach.langnote.ms")));
    }
    out.appendChild(el("p", null, t("coach.footnote")));
    return out;
  }
  function coachBox(kind) {
    var box = el("div", "coach-box");
    box.appendChild(el("p", "disclosure", t("coach.disclosure")));
    var phase = state.ai.phase;
    var label = phase === "loading" ? "coach.btn.loading"
              : phase === "done" ? "coach.btn.again"
              : phase === "error" ? "coach.btn.retry"
              : (kind === "borderline" ? "coach.btn.border" : "coach.btn.block");
    var btn = el("button", "btn btn--secondary", t(label));
    btn.type = "button";
    btn.id = "coach-btn";
    btn.disabled = phase === "loading";
    btn.addEventListener("click", function () { requestCoaching(btn); });
    box.appendChild(btn);
    var out = el("div", "coach-out");
    out.id = "coach-out";
    out.setAttribute("aria-live", "polite");
    if (phase === "done" && state.ai.data) out.appendChild(suggestions(state.ai.data, state.ai.lang));
    if (phase === "error") out.appendChild(el("p", "field-error", t(state.ai.status === 429 ? "coach.err.429" : "coach.err.generic")));
    box.appendChild(out);
    return box;
  }
  function resultPanel(kind, withCoach) {
    var p;
    if (kind === "support") return supportPanel();
    if (kind === "ok") {
      p = panel("ok", "res.ok.tag", "res.ok.title");
      p.appendChild(el("p", null, t("res.ok.body")));
      return p;
    }
    if (kind === "borderline") {
      p = panel("warn", "res.border.tag", "res.border.title");
      p.appendChild(el("p", null, t("res.border.body")));
    } else {
      p = panel("bad", "res.block.tag", "res.block.title");
      p.appendChild(el("p", null, t("res.block.body")));
    }
    p.appendChild(tipsList());
    if (withCoach && WORKER_URL) p.appendChild(coachBox(kind));
    return p;
  }

  function renderResult() {
    if (state.model === "error") {
      var p = panel("bad", "model.fail.tag", "model.fail.title");
      p.appendChild(el("p", null, t("model.fail.body")));
      var retry = el("button", "btn btn--secondary", t("model.fail.retry"));
      retry.type = "button";
      retry.addEventListener("click", loadModel);
      p.appendChild(retry);
      result.replaceChildren(p);
      return;
    }
    if (!state.checked) { result.replaceChildren(); return; }
    result.replaceChildren(resultPanel(state.checked.kind, true));
  }

  function renderRevision() {
    revResult.replaceChildren();
    var r = state.revResult;
    if (!r) return;
    var tagKey = { ok: "rev.tag.ok", borderline: "rev.tag.border", block: "rev.tag.block", support: "rev.tag.support" };
    function col(labelKey, text, kind) {
      var c = el("div", "compare__col");
      c.appendChild(el("h4", null, t(labelKey)));
      c.appendChild(el("p", null, text));
      c.appendChild(el("span", "tag", t(tagKey[kind])));
      return c;
    }
    var wrap = el("div", "compare");
    wrap.appendChild(col("rev.original", r.orig.text, r.orig.kind));
    wrap.appendChild(col("rev.yours", r.text, r.kind));
    revResult.appendChild(wrap);
    var p = resultPanel(r.kind, false);
    p.style.marginTop = "1rem";
    revResult.appendChild(p);
    revResult.appendChild(el("p", "field-hint", t("rev.note")));
  }

  function renderAll() {
    renderStatus();
    renderField(draftError, draft, state.draftErr);
    renderField(revError, revision, state.revErr);
    renderResult();
    renderRevision();
  }

  // ---------- AI coaching ----------
  function requestCoaching(btn) {
    if (btn.disabled) return;                       // a request is already in flight
    var snapshot = state.checked;
    if (!snapshot || (snapshot.kind !== "block" && snapshot.kind !== "borderline")) return;
    cancelPending();
    var controller = new AbortController();
    state.controller = controller;
    var myRev = snapshot.rev;
    var reqLang = L.get();                           // language the user chose for this request
    state.ai = { phase: "loading", data: null, status: 0, lang: reqLang };
    setStatus("status.ai.loading");
    renderResult();

    function stillCurrent() { return state.checked && state.checked.rev === myRev && state.controller === controller; }

    fetch(WORKER_URL.replace(/\/$/, "") + "/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: snapshot.text, band: snapshot.kind, lang: reqLang }),
      signal: controller.signal
    }).then(function (r) {
      if (!r.ok) { var e = new Error("http"); e.status = r.status; throw e; }
      return r.json();
    }).then(function (data) {
      if (!stillCurrent()) return;                   // draft changed or newer check ran: ignore this reply
      state.controller = null;
      state.ai = { phase: "done", data: data, status: 200, lang: reqLang };
      setStatus("status.ai.ready");
      renderResult();
    }).catch(function (err) {
      if (err && err.name === "AbortError") return;
      if (!stillCurrent()) return;
      state.controller = null;
      state.ai = { phase: "error", data: null, status: (err && err.status) || 0, lang: reqLang };
      setStatus("status.ai.failed");
      renderResult();
    });
  }

  // ---------- main check ----------
  function runCheck() {
    if (!state.detector) return;
    var text = draft.value.trim();
    cancelPending();
    aiReset();
    state.rev++;
    if (!text) {
      state.checked = null;
      state.draftErr = "err.draft.empty";
      setStatus(null);
      renderField(draftError, draft, state.draftErr);
      renderResult();
      draft.focus();
      return;
    }
    state.draftErr = null;
    var a = assess(text);
    state.checked = { text: text, kind: a.kind, rev: state.rev };
    state.original = { text: text, kind: a.kind };
    state.revResult = null;                          // an earlier revision result is now out of date
    reflect.hidden = a.kind === "support";
    renderField(draftError, draft, null);
    renderResult();
    renderRevision();
    setStatus({ ok: "status.ok", borderline: "status.borderline", block: "status.block", support: "status.support" }[a.kind]);
  }

  function onDraftInput() {
    updateCount(draft, count);
    if (state.draftErr) { state.draftErr = null; renderField(draftError, draft, null); }
    if (state.checked && draft.value.trim() !== state.checked.text) {
      cancelPending();
      state.rev++;                                   // invalidates any reply still in flight
      state.checked = null;
      aiReset();
      renderResult();
      setStatus("status.changed");
    }
  }

  // ---------- reflection and revision ----------
  function runRevisionCheck() {
    if (!state.detector) return;
    var text = revision.value.trim();
    if (!text) {
      state.revResult = null;
      state.revErr = "err.rev.empty";
      renderField(revError, revision, state.revErr);
      renderRevision();
      revision.focus();
      return;
    }
    state.revErr = null;
    renderField(revError, revision, null);
    var a = assess(text);
    var orig = state.original || { text: draft.value.trim(), kind: "ok" };
    state.revResult = { text: text, kind: a.kind, orig: orig };
    renderRevision();
    setStatus("status.revchecked");
  }

  function reset() {
    cancelPending();
    aiReset();
    state.rev++;
    state.checked = null;
    state.original = null;
    state.revResult = null;
    state.draftErr = null;
    state.revErr = null;
    draft.value = ""; reflection.value = ""; revision.value = "";
    updateCount(draft, count); updateCount(revision, revCount);
    revWrap.hidden = true; reflect.hidden = true;
    renderAll();
    setStatus("status.cleared");
    draft.focus();
  }

  // ---------- wiring ----------
  draft.addEventListener("input", onDraftInput);
  revision.addEventListener("input", function () {
    updateCount(revision, revCount);
    if (state.revErr) { state.revErr = null; renderField(revError, revision, null); }
    state.revResult = null;
    renderRevision();
  });
  checkBtn.addEventListener("click", runCheck);
  checkRevBtn.addEventListener("click", runRevisionCheck);
  resetBtn.addEventListener("click", reset);
  writeRevisionBtn.addEventListener("click", function () { revWrap.hidden = false; revision.focus(); });
  Array.prototype.forEach.call(document.querySelectorAll(".scenario"), function (b) {
    b.addEventListener("click", function () {
      draft.value = b.getAttribute("data-text");   // always the English detector example
      onDraftInput();
      state.draftErr = null;
      renderField(draftError, draft, null);
      setStatus("status.scenario");
      draft.focus();
    });
  });
  var cta = $("cta-try");
  if (cta) cta.addEventListener("click", function (e) {
    e.preventDefault();
    draft.scrollIntoView({ block: "center", behavior: "auto" });
    draft.focus({ preventScroll: true });
  });

  // hero example: user-triggered swap with a short fade; language change re-renders from the same keys
  var exToggle = $("ex-toggle");
  function showExample() {
    $("ex-draft").setAttribute("data-i18n", "hero.ex" + state.exIndex + ".draft");
    $("ex-rev").setAttribute("data-i18n", "hero.ex" + state.exIndex + ".rev");
    L.applyStatic(document.querySelector(".exchange"));
  }
  if (exToggle) exToggle.addEventListener("click", function () {
    state.exIndex = (state.exIndex + 1) % EXAMPLES;
    var boxes = [$("ex-draft-box"), $("ex-rev-box")];
    function swap() { showExample(); boxes.forEach(function (b) { b.classList.remove("is-fading"); }); }
    if (reduceMotion) { swap(); return; }
    boxes.forEach(function (b) { b.classList.add("is-fading"); });
    setTimeout(swap, 180);
  });

  // switching language re-renders labels only: no check, no request, no change to any draft text
  L.onChange(function () { renderAll(); });

  // ---------- model loading ----------
  function loadModel() {
    checkBtn.disabled = true;
    state.model = "loading";
    state.statusKey = "status.loading";
    renderStatus();
    renderResult();
    fetch("model.json").then(function (r) {
      if (!r.ok) throw new Error("model " + r.status);
      return r.json();
    }).then(function (m) {
      state.detector = AggressionDetector.create(m);
      state.model = "ready";
      checkBtn.disabled = false;
      setStatus("status.ready");
      renderResult();
    }).catch(function () {
      state.model = "error";
      setStatus("status.modelfail");
      renderResult();
    });
  }

  L.init();
  updateCount(draft, count);
  updateCount(revision, revCount);
  loadModel();
})();

// Localised What Is Moodify copy.
(function(){
  var copy=document.querySelector('.what-is-moodify__copy'); if(!copy) return;
  var en='<p class="eyebrow">WELCOME TO MOODIFY</p><h2>What Is Moodify?</h2><p class="what-is-moodify__subtitle">A Smarter Way to Understand Emotions and Change the Way We Respond.</p><p>The name <strong>Moodify</strong> combines <em>mood</em> and <em>modify</em>. Students may not always control what they feel, but they can learn to understand their emotions and modify how they respond.</p><p>Moodify does not simply tell students what to say. It provides a safe, supervised space to practise, reflect and make their own decisions.</p><p>Unlike ChatGPT or a conventional chatbot, Moodify is not designed to provide general answers. It is a bounded, psychology-based AI learning environment that guides adolescents aged 13–15 through five steps:</p>';
  var bm='<p class="eyebrow">SELAMAT DATANG KE MOODIFY</p><h2>Apakah Moodify?</h2><p class="what-is-moodify__subtitle">Cara yang Lebih Bijak untuk Memahami Emosi dan Memilih Tindak Balas</p><p>Nama <strong>Moodify</strong> ialah gabungan perkataan <em>mood</em> yang bermaksud emosi dan <em>modify</em> yang bermaksud mengubah.</p><p>Kadangkala, kita tidak dapat memilih perasaan yang kita alami. Namun, kita boleh belajar untuk memahami perasaan tersebut dan memilih cara yang lebih baik untuk bertindak balas.</p><p>Moodify bukan sekadar memberitahu pelajar perkara yang perlu dikatakan. Moodify menyediakan ruang pembelajaran yang selamat dan diselia oleh guru untuk membantu pelajar berlatih, membuat refleksi dan membuat keputusan sendiri.</p><p>Berbeza daripada ChatGPT atau chatbot biasa, Moodify tidak memberikan jawapan umum. Moodify ialah <strong>persekitaran pembelajaran AI berasaskan psikologi</strong> yang membantu remaja berusia 13 hingga 15 tahun belajar melalui lima langkah:</p>';
  var steps='<div class="moodify-process" aria-label="Moodify five-step process"><span>Write</span><b aria-hidden="true">→</b><span>Detect</span><b aria-hidden="true">→</b><span>Pause &amp; Identify</span><b aria-hidden="true">→</b><span>Compare</span><b aria-hidden="true">→</b><span>Evaluate &amp; Revise</span></div>';
  function render(){ var ms=document.documentElement.lang.indexOf('ms')===0; copy.innerHTML=(ms?bm:en)+steps; }
  render(); new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();

// Tidy the welcoming artwork placed before What Is Moodify.
(function(){
  function tidy(){
    var section=document.querySelector('.what-is-moodify'); if(!section) return;
    var prev=section.previousElementSibling;
    if(prev && (prev.matches('img') || prev.querySelector && prev.querySelector('img'))){
      prev.classList.add('welcoming-art-before');
      var img=prev.matches('img')?prev:prev.querySelector('img');
      if(img){img.style.display='block';img.style.width='min(70vw,720px)';img.style.maxWidth='720px';img.style.height='auto';img.style.margin='0 auto';img.style.background='transparent';}
      prev.style.background='transparent'; prev.style.textAlign='center'; prev.style.margin='1rem auto';
    }
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT), n;
    while(n=walker.nextNode()){ if(n.nodeValue.trim()==='\\n') n.nodeValue=''; }
  }
  tidy();
})();


(function(){function uncrop(){document.querySelectorAll('.team-inline .team-photo').forEach(function(img){img.style.setProperty('aspect-ratio','auto','important');img.style.setProperty('height','auto','important');img.style.setProperty('max-height','none','important');img.style.setProperty('object-fit','contain','important');img.style.setProperty('object-position','center top','important');});} if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',uncrop); else uncrop();})();
