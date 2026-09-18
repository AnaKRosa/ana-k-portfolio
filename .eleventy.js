module.exports = function (eleventyConfig) {
  return {
    dir: {
      // src/posts/ (English) and src/posts-es/ (Spanish) both live under
      // src/, so both are scanned as content. src/_includes/ (post.html)
      // and src/_data/ (postTranslations.js) are auto-excluded from
      // content by Eleventy — they're templates/data, not pages.
      // Nothing else in the repo is scanned or built by Eleventy.
      input: "src",
      includes: "_includes",
      // Netlify's publish dir (see netlify.toml: publish = ".") — the project
      // root. Eleventy writes generated post pages straight into it, next to
      // the rest of the static site.
      output: "."
    }
  };
};
