module.exports = function (eleventyConfig) {
  return {
    dir: {
      // Only src/posts/ is treated as content — nothing else in the repo
      // is scanned or built by Eleventy.
      input: "src/posts",
      // Resolved relative to `input`, so this points at src/_includes/
      // (where post.html lives) without pulling _includes into the input scope.
      includes: "../_includes",
      // Netlify's publish dir (see netlify.toml: publish = ".") — the project
      // root. Eleventy writes generated post pages straight into it, next to
      // the rest of the static site.
      output: "."
    }
  };
};
