#!/usr/bin/env node
/**
 * Regenerates the auto-owned post-card sections across the site, combining:
 *   - every markdown post in src/posts/ (English) and src/posts-es/
 *     (Spanish) — the CMS/Eleventy pipeline, picked up automatically, no
 *     manual edits needed as new posts are published through Decap CMS
 *   - the older hand-written English posts listed in legacy-posts.json
 *     (there is no Spanish equivalent yet — the Spanish grids are driven
 *     entirely by src/posts-es/)
 *
 * Two pages, each with a language-aware pair of blocks (shown/hidden by
 * i18n.js's applyLangGrids() based on the site's language toggle):
 *   1. index.html — the "From the blog" preview: the 3 most recent posts
 *      per language.
 *   2. blog.html  — the full posts-grid: every post per language EXCEPT
 *      whichever one is marked "featured" (still hand-authored as
 *      blog.html's featured card, English-only, untouched by this
 *      script).
 *
 * Image priority for every card: a post's "Home Thumbnail" (homeThumbnail
 * frontmatter / legacy-posts.json "image") if set, otherwise its Featured
 * Image (heroImage) is reused. The Featured Image itself is never touched
 * here — it stays the post's own hero/og:image.
 *
 * Runs as part of the Netlify build (see netlify.toml), after Eleventy,
 * so every section always reflects whatever is newest on every deploy.
 *
 * The blocks between the RECENT-POSTS:START/END, RECENT-POSTS-ES:START/END
 * (index.html) and POSTS-GRID:START/END, POSTS-GRID-ES:START/END
 * (blog.html) comments are fully owned by this script — don't hand-edit
 * them, edits will be overwritten on the next build.
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const LEGACY_PATH = path.join(ROOT, "legacy-posts.json");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadLegacyPosts() {
  if (!fs.existsSync(LEGACY_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(LEGACY_PATH, "utf8"));
  return raw.map((p) => ({
    title: p.title,
    url: p.url,
    tag: p.tag,
    dateDisplay: p.dateDisplay,
    dateSort: new Date(p.dateSort),
    readTime: p.readTime,
    image: p.image,
    imageAlt: p.imageAlt || p.title,
    excerpt: p.excerpt || "",
    featured: !!p.featured,
  }));
}

function loadMarkdownPosts(dir, urlPrefix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      // Home Thumbnail wins when set; otherwise reuse the Featured Image.
      // The Featured Image (heroImage) itself is left untouched elsewhere
      // (post.html layout) as the post's own hero/og:image.
      const image = (data.homeThumbnail || data.heroImage || "").replace(/^\//, "");
      const dateSort = new Date(data.postDate);
      return {
        title: data.title,
        url: `${urlPrefix}${slug}/`,
        tag: data.tag,
        dateDisplay: data.postDate,
        dateSort: isNaN(dateSort) ? new Date() : dateSort,
        readTime: data.readTime,
        image,
        imageAlt: data.heroImageAlt || data.title,
        excerpt: data.excerpt || data.description || "",
        featured: false,
      };
    });
}

function loadEnPosts() {
  return [
    ...loadMarkdownPosts(path.join(ROOT, "src/posts"), "posts/"),
    ...loadLegacyPosts(),
  ].filter((p) => p.title && p.url);
}

function loadEsPosts() {
  return loadMarkdownPosts(path.join(ROOT, "src/posts-es"), "es/posts/").filter(
    (p) => p.title && p.url
  );
}

function replaceBlock(filePath, startMarker, endMarker, html, label) {
  const full = fs.readFileSync(filePath, "utf8");
  const startIdx = full.indexOf(startMarker);
  const endIdx = full.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`[build-recent-posts] ${label} markers not found in ${filePath} — aborting so nothing is silently skipped.`);
  }
  const block = html ? `${startMarker}\n${html}\n    ${endMarker}` : `${startMarker}\n    ${endMarker}`;
  const updated = full.slice(0, startIdx) + block + full.slice(endIdx + endMarker.length);
  fs.writeFileSync(filePath, updated);
}

// --- index.html: top 3 most recent posts per language, as .blog-card entries ---

function buildBlogCardHtml(post, index) {
  const delayAttr = index === 0 ? "" : ` style="transition-delay:${(index * 0.1).toFixed(1)}s"`;
  return `    <a href="${escapeHtml(post.url)}" class="blog-card fade-up"${delayAttr}>
      <div class="blog-thumb"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy"></div>
      <span class="blog-tag">${escapeHtml(post.tag)}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <span class="blog-meta">${escapeHtml(post.dateDisplay)} · ${escapeHtml(post.readTime)}</span>
    </a>`;
}

const ES_EMPTY_NOTE = `    <p style="grid-column:1/-1;font-size:0.85rem;opacity:0.45;">Próximamente — artículos en español.</p>`;

function buildIndexHome(enPosts, esPosts) {
  const INDEX_PATH = path.join(ROOT, "index.html");
  const START_EN = "<!-- RECENT-POSTS:START — auto-generated by scripts/build-recent-posts.js on every build, do not hand-edit -->";
  const END_EN = "<!-- RECENT-POSTS:END -->";
  const START_ES = "<!-- RECENT-POSTS-ES:START — auto-generated by scripts/build-recent-posts.js on every build, do not hand-edit -->";
  const END_ES = "<!-- RECENT-POSTS-ES:END -->";

  const topEn = [...enPosts].sort((a, b) => b.dateSort - a.dateSort).slice(0, 3);
  if (topEn.length === 0) {
    console.warn("[build-recent-posts] No English posts found — leaving index.html EN blog section untouched.");
  } else {
    replaceBlock(INDEX_PATH, START_EN, END_EN, topEn.map(buildBlogCardHtml).join("\n"), "RECENT-POSTS");
    console.log(`[build-recent-posts] index.html (EN) updated with: ${topEn.map((p) => p.title).join(" | ")}`);
  }

  const topEs = [...esPosts].sort((a, b) => b.dateSort - a.dateSort).slice(0, 3);
  const esHtml = topEs.length > 0 ? topEs.map(buildBlogCardHtml).join("\n") : ES_EMPTY_NOTE;
  replaceBlock(INDEX_PATH, START_ES, END_ES, esHtml, "RECENT-POSTS-ES");
  console.log(`[build-recent-posts] index.html (ES) updated with ${topEs.length} post(s).`);
}

// --- blog.html: full posts-grid per language, every post except the featured one ---

function buildPostCardHtml(post, index) {
  const delayAttr = index === 0 ? "" : ` style="transition-delay:${(index * 0.08).toFixed(2)}s"`;
  return `    <a href="${escapeHtml(post.url)}" class="post-card fade-up"${delayAttr}>
      <div class="post-img">
        <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy">
      </div>
      <div class="post-body">
        <span class="post-tag">${escapeHtml(post.tag)}</span>
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="post-meta">
          <span class="meta-item">${escapeHtml(post.dateDisplay)}</span>
          <span class="meta-dot"></span>
          <span class="meta-item">${escapeHtml(post.readTime)}</span>
        </div>
      </div>
    </a>`;
}

function buildBlogListing(enPosts, esPosts) {
  const BLOG_PATH = path.join(ROOT, "blog.html");
  const START_EN = "<!-- POSTS-GRID:START — auto-generated by scripts/build-recent-posts.js on every build, do not hand-edit. Excludes whichever post is set as \"featured\" above. -->";
  const END_EN = "<!-- POSTS-GRID:END -->";
  const START_ES = "<!-- POSTS-GRID-ES:START — auto-generated by scripts/build-recent-posts.js on every build, do not hand-edit. -->";
  const END_ES = "<!-- POSTS-GRID-ES:END -->";

  const allEn = [...enPosts].filter((p) => !p.featured).sort((a, b) => b.dateSort - a.dateSort);
  if (allEn.length === 0) {
    console.warn("[build-recent-posts] No English posts found — leaving blog.html EN posts-grid untouched.");
  } else {
    replaceBlock(BLOG_PATH, START_EN, END_EN, allEn.map(buildPostCardHtml).join("\n"), "POSTS-GRID");
    console.log(`[build-recent-posts] blog.html (EN) updated with ${allEn.length} post(s).`);
  }

  const allEs = [...esPosts].filter((p) => !p.featured).sort((a, b) => b.dateSort - a.dateSort);
  const esHtml = allEs.length > 0 ? allEs.map(buildPostCardHtml).join("\n") : ES_EMPTY_NOTE;
  replaceBlock(BLOG_PATH, START_ES, END_ES, esHtml, "POSTS-GRID-ES");
  console.log(`[build-recent-posts] blog.html (ES) updated with ${allEs.length} post(s).`);
}

function main() {
  const enPosts = loadEnPosts();
  const esPosts = loadEsPosts();
  buildIndexHome(enPosts, esPosts);
  buildBlogListing(enPosts, esPosts);
}

main();
