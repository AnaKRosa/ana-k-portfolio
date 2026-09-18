// Eleventy global data — NOT the site's client-side translations.js
// dictionary (that's a separate, unrelated file loaded in the browser).
//
// Builds a map of translationKey -> { en: url, es: url } by scanning both
// src/posts/ and src/posts-es/. The post.html layout uses this at build
// time to find a post's sibling in the other language (for the nav
// language toggle and the hreflang tags), falling back to /blog.html
// when no match exists.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

function loadDir(dir, lang, urlPrefix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      return {
        lang,
        translationKey: data.translationKey || null,
        url: `${urlPrefix}${slug}/`,
      };
    });
}

module.exports = function () {
  const ROOT = path.join(__dirname, "../.."); // src/_data -> project root
  const posts = [
    ...loadDir(path.join(ROOT, "src/posts"), "en", "/posts/"),
    ...loadDir(path.join(ROOT, "src/posts-es"), "es", "/es/posts/"),
  ];

  const map = {};
  posts.forEach((p) => {
    if (!p.translationKey) return;
    if (!map[p.translationKey]) map[p.translationKey] = {};
    map[p.translationKey][p.lang] = p.url;
  });
  return map;
};
