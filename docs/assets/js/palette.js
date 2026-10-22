(function () {
  'use strict';
  var palettes = {
    a: { ms: 'Teal Laut', en: 'Sea teal', colors: ['#147c7b','#165b67','#ed1760','#ffb20f'] },
    b: { ms: 'Biru Rasmi', en: 'Royal blue', colors: ['#1261a6','#1d3f8f','#db2939','#f4bd25'] },
    c: { ms: 'Ungu Diraja', en: 'Royal purple', colors: ['#5b36bf','#343092','#d5297b','#f2b62b'] },
    d: { ms: 'Hijau Hutan', en: 'Forest green', colors: ['#087443','#175b4d','#d14a0b','#f0ba28'] },
    e: { ms: 'Bata Senja', en: 'Sunset brick', colors: ['#a83e1e','#71311f','#2c51d1','#e8b522'] },
    f: { ms: 'Kelabu Korporat', en: 'Corporate grey', colors: ['#26394d','#233448','#2186b7','#efba18'] }
  };
  var key = 'moodify-palette';
  var saved = localStorage.getItem(key) || 'a';
  if (!palettes[saved]) saved = 'a';
  document.documentElement.dataset.palette = saved;
  var box = document.createElement('div');
  box.className = 'palette-picker';
  box.innerHTML = '<button type="button" class="palette-fab" aria-expanded="false" aria-controls="moodify-palette-menu" aria-label="Pilih palet warna"><span aria-hidden="true">●</span><span aria-hidden="true">●</span><span aria-hidden="true">●</span></button><div class="palette-menu" id="moodify-palette-menu" hidden><p class="palette-menu__title">Palet warna</p><div class="palette-options" id="moodify-palette-options"></div></div>';
  document.body.appendChild(box);
  var fab = box.querySelector('.palette-fab');
  var menu = box.querySelector('.palette-menu');
  var options = box.querySelector('.palette-options');
  function language() { return document.documentElement.lang && document.documentElement.lang.indexOf('en') === 0 ? 'en' : 'ms'; }
  function refreshText() {
    var lang = language();
    box.querySelector('.palette-menu__title').textContent = lang === 'en' ? 'Colour palette' : 'Palet warna';
    fab.setAttribute('aria-label', lang === 'en' ? 'Choose a colour palette' : 'Pilih palet warna');
    options.innerHTML = Object.keys(palettes).map(function (id) { var p=palettes[id]; return '<button type="button" class="palette-option" data-palette-choice="'+id+'" aria-pressed="'+(id===saved)+'"><span class="palette-swatches">'+p.colors.map(function(c){return '<i style="background:'+c+'"></i>';}).join('')+'</span><span>'+p[lang]+'</span></button>'; }).join('');
    Array.prototype.forEach.call(options.querySelectorAll('[data-palette-choice]'), function (button) { button.addEventListener('click', function () { saved=button.dataset.paletteChoice; localStorage.setItem(key,saved); document.documentElement.dataset.palette=saved; refreshText(); menu.hidden=true; fab.setAttribute('aria-expanded','false'); }); });
  }
  refreshText();
  fab.addEventListener('click', function () { menu.hidden=!menu.hidden; fab.setAttribute('aria-expanded', String(!menu.hidden)); });
  window.MOODIFY_PALETTE = { refreshText: refreshText };
  var observer = new MutationObserver(refreshText);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}());
