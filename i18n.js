// i18n.js — Language engine for anakrosadesign.com
// Default: English. Persists via localStorage.

const LANG_KEY = 'ak_lang';

function getLang() {
  return localStorage.getItem(LANG_KEY) || 'en';
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations(lang);
  updateToggle(lang);
  applyLangGrids(lang);
}

function getNestedValue(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function applyTranslations(lang) {
  const t = translations[lang];
  if (!t) return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = getNestedValue(t, key);
    if (value !== undefined) el.innerHTML = value;
  });
}

function updateToggle(lang) {
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'en' ? 'ES' : 'EN';
}

// Shows/hides language-specific blocks of content (e.g. the blog cards on
// the homepage and blog.html, which live in two parallel EN/ES grids)
// based on the current language — anything marked data-lang-grid="en"/"es".
function applyLangGrids(lang) {
  document.querySelectorAll('[data-lang-grid]').forEach(el => {
    el.hidden = el.getAttribute('data-lang-grid') !== lang;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const lang = getLang();
  applyTranslations(lang);
  updateToggle(lang);
  applyLangGrids(lang);

  const btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      setLang(getLang() === 'en' ? 'es' : 'en');
    });
  }
});
