(function () {
  'use strict';
  var palettes = {
    a: { ms: 'A · Teal + pic', en: 'A · Teal + peach' },
    b: { ms: 'B · Biru + limau', en: 'B · Blue + lime' },
    c: { ms: 'C · Ungu + kuning', en: 'C · Purple + yellow' }
  };
  var key = 'moodify-palette';
  var saved = localStorage.getItem(key) || 'a';
  if (!palettes[saved]) saved = 'a';
  document.documentElement.dataset.palette = saved;
  var box = document.createElement('div');
  box.className = 'palette-picker';
  box.innerHTML = '<label for="moodify-palette" data-palette-label>Palet warna</label><select id="moodify-palette" aria-label="Pilih palet warna"><option value="a"></option><option value="b"></option><option value="c"></option></select>';
  document.body.appendChild(box);
  var select = box.querySelector('select');
  var label = box.querySelector('label');
  function language() { return document.documentElement.lang && document.documentElement.lang.indexOf('en') === 0 ? 'en' : 'ms'; }
  function refreshText() {
    var lang = language();
    label.textContent = lang === 'en' ? 'Colour palette' : 'Palet warna';
    select.setAttribute('aria-label', lang === 'en' ? 'Choose a colour palette' : 'Pilih palet warna');
    Array.prototype.forEach.call(select.options, function (option) { option.textContent = palettes[option.value][lang]; });
  }
  select.value = saved;
  refreshText();
  select.addEventListener('change', function () {
    saved = select.value;
    localStorage.setItem(key, saved);
    document.documentElement.dataset.palette = saved;
  });
  window.MOODIFY_PALETTE = { refreshText: refreshText };
  var observer = new MutationObserver(refreshText);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}());
