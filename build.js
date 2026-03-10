const fs = require('fs');
const path = require('path');

// Simple markdown to HTML converter
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 id="s$1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => {
      if (m.match(/^\d/)) return `<ol>${m}</ol>`;
      return `<ul>${m}</ul>`;
    })
    .replace(/^(?!<[huo]|<li|<block)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .trim();
}

// Parse frontmatter from markdown file
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  
  const data = {};
  match[1].split('\n').forEach(line => {
    const [key, ...val] = line.split(':');
    if (key && val.length) data[key.trim()] = val.join(':').trim().replace(/^["']|["']$/g, '');
  });
  
  return { data, body: match[2].trim() };
}

// Generate slug from filename
function getSlug(filename) {
  return filename.replace('.md', '');
}

// Calculate read time
function readTime(text) {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 200);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Generate blog post HTML page
function generatePostHtml(post) {
  const { data, body, slug } = post;
  const htmlBody = markdownToHtml(body);
  const mins = readTime(body);
  const date = formatDate(data.date);
  const imgSrc = data.image ? data.image : null;

  // Extract h2 sections for TOC
  const sections = [...body.matchAll(/^## (.+)$/gm)].map((m, i) => ({
    id: `s${i + 1}`,
    label: m[1]
  }));

  const tocHtml = sections.map((s, i) =>
    `<a href="#${s.id}" class="toc-item${i === 0 ? ' active' : ''}">${s.label}</a>`
  ).join('\n        ');

  // Fix h2 IDs in body
  let bodyWithIds = body;
  sections.forEach((s, i) => {
    bodyWithIds = bodyWithIds.replace(`## ${s.label}`, `## [ID:${s.id}] ${s.label}`);
  });

  let finalHtml = markdownToHtml(bodyWithIds);
  finalHtml = finalHtml.replace(/<h2 id="s\[ID:(s\d+)\] (.+?)">.*?<\/h2>/g, 
    (_, id, label) => `<h2 id="${id}">${label}</h2>`);
  
  // Simpler approach for IDs
  let sectionCounter = 0;
  finalHtml = htmlBody.replace(/<h2 id="[^"]*">(.+?)<\/h2>/g, (_, label) => {
    sectionCounter++;
    return `<h2 id="s${sectionCounter}">${label}</h2>`;
  });

  const heroImgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${data.title}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : `<div class="ph"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>Image</span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.title} · Ana K.</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #f4f1eb; --black: #0e0e0e; --forest: #2c4a35;
    --lavender: #c5bff5; --lime: #EAF58D;
    --serif: 'Instrument Serif', Georgia, serif;
    --sans: 'DM Sans', sans-serif;
  }
  html { scroll-behavior: smooth; }
  body { font-family: var(--sans); background: var(--cream); color: var(--black); overflow-x: hidden; }
  .progress-bar { position: fixed; top: 0; left: 0; z-index: 200; height: 2px; background: var(--lavender); width: 0%; transition: width 0.1s linear; }
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: var(--cream); border-bottom: 1px solid rgba(0,0,0,0.07); padding: 0 48px; }
  .nav-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 18px 0; }
  .logo { font-family: var(--serif); font-size: 1.5rem; letter-spacing: 0.04em; text-decoration: none; color: var(--black); }
  .nav-links { display: flex; gap: 28px; list-style: none; }
  .nav-links a { font-size: 0.8rem; text-decoration: none; color: var(--black); opacity: 0.55; letter-spacing: 0.04em; transition: opacity 0.2s; }
  .nav-links a:hover, .nav-links a.active { opacity: 1; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
  .back-link { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; opacity: 0.4; text-decoration: none; color: var(--black); letter-spacing: 0.04em; padding-top: 108px; margin-bottom: 48px; transition: opacity 0.2s, gap 0.2s; }
  .back-link:hover { opacity: 0.8; gap: 12px; }
  .post-hero { padding-bottom: 64px; }
  .post-meta-top { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
  .post-tag { font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; background: var(--lavender); color: var(--black); padding: 5px 12px; border-radius: 100px; font-weight: 500; }
  .post-meta-top .meta-item { font-size: 0.72rem; opacity: 0.4; }
  .meta-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--black); opacity: 0.2; }
  .post-title { font-family: var(--serif); font-size: clamp(2.2rem, 4.5vw, 3.8rem); font-weight: 400; line-height: 1.1; letter-spacing: -0.02em; max-width: 820px; margin-bottom: 28px; }
  .post-excerpt { font-size: 1.05rem; line-height: 1.8; opacity: 0.55; max-width: 640px; font-family: var(--serif); font-style: italic; margin-bottom: 40px; }
  .author-row { display: flex; align-items: center; gap: 14px; padding: 20px 0; border-top: 1px solid rgba(0,0,0,0.08); border-bottom: 1px solid rgba(0,0,0,0.08); }
  .author-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--lavender); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--serif); font-size: 0.9rem; }
  .author-name { font-size: 0.82rem; font-weight: 500; }
  .author-role { font-size: 0.72rem; opacity: 0.4; }
  .hero-img { width: 100%; height: 560px; background: #c0ccc4; border-radius: 12px; overflow: hidden; margin: 48px 0 0; display: flex; align-items: center; justify-content: center; }
  .hero-img img { width: 100%; height: 100%; object-fit: cover; }
  .hero-img .ph { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 100%; }
  .hero-img .ph svg { opacity: 0.2; }
  .content-layout { display: grid; grid-template-columns: 1fr 680px 1fr; gap: 0; padding: 72px 0 120px; }
  .sidebar-left { padding-right: 48px; position: sticky; top: 100px; height: fit-content; align-self: start; }
  .toc-label { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.3; font-weight: 500; margin-bottom: 16px; }
  .toc { display: flex; flex-direction: column; gap: 2px; }
  .toc-item { font-size: 0.78rem; line-height: 1.5; opacity: 0.4; text-decoration: none; color: var(--black); padding: 6px 0 6px 12px; border-left: 1px solid rgba(0,0,0,0.12); transition: opacity 0.2s, border-color 0.2s; }
  .toc-item:hover, .toc-item.active { opacity: 1; border-color: var(--lavender); }
  .article-body { min-width: 0; }
  .article-body h2 { font-family: var(--serif); font-size: 1.9rem; font-weight: 400; line-height: 1.2; letter-spacing: -0.01em; margin: 56px 0 20px; color: var(--black); }
  .article-body h2:first-child { margin-top: 0; }
  .article-body h3 { font-family: var(--serif); font-size: 1.3rem; font-weight: 400; margin: 36px 0 14px; }
  .article-body p { font-size: 0.96rem; line-height: 1.9; opacity: 0.75; margin-bottom: 20px; }
  .article-body ul, .article-body ol { padding-left: 0; margin: 20px 0 28px; display: flex; flex-direction: column; gap: 10px; list-style: none; }
  .article-body ul li { font-size: 0.94rem; line-height: 1.75; opacity: 0.75; padding-left: 20px; position: relative; }
  .article-body ul li::before { content: '•'; position: absolute; left: 0; opacity: 0.4; }
  .article-body ol { counter-reset: ol; }
  .article-body ol li { font-size: 0.94rem; line-height: 1.75; opacity: 0.75; padding-left: 28px; position: relative; counter-increment: ol; }
  .article-body ol li::before { content: counter(ol) '.'; position: absolute; left: 0; opacity: 0.35; font-size: 0.85rem; }
  .article-body blockquote { margin: 36px 0; padding: 28px 36px; background: rgba(197,191,245,0.12); border-left: 3px solid var(--lavender); border-radius: 0 8px 8px 0; }
  .article-body blockquote p { font-family: var(--serif); font-style: italic; font-size: 1.15rem; line-height: 1.7; opacity: 0.8; margin: 0; }
  .sidebar-right { padding-left: 48px; position: sticky; top: 100px; height: fit-content; align-self: start; }
  .share-label { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.3; font-weight: 500; margin-bottom: 16px; }
  .share-links { display: flex; flex-direction: column; gap: 8px; }
  .share-link { display: flex; align-items: center; gap: 10px; font-size: 0.78rem; opacity: 0.4; text-decoration: none; color: var(--black); transition: opacity 0.2s; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.07); }
  .share-link:hover { opacity: 1; }
  .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.65s ease, transform 0.65s ease; }
  .fade-up.visible { opacity: 1; transform: translateY(0); }
  .hamburger { display: none; flex-direction: column; justify-content: center; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
  .hamburger span { display: block; width: 22px; height: 2px; background: var(--black); border-radius: 2px; transition: transform 0.3s ease, opacity 0.3s ease; transform-origin: center; }
  .hamburger.open span:first-child { transform: translateY(7px) rotate(45deg); }
  .hamburger.open span:nth-child(2) { opacity: 0; }
  .hamburger.open span:last-child { transform: translateY(-7px) rotate(-45deg); }
  .mobile-menu { display: none; position: fixed; inset: 0; background: var(--cream); z-index: 99; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
  .mobile-menu.open { display: flex; }
  .mob-link { font-family: var(--serif); font-size: 2.8rem; color: var(--black); text-decoration: none; font-weight: 400; line-height: 1.4; opacity: 0; transform: translateY(16px); transition: opacity 0.35s ease, transform 0.35s ease; letter-spacing: -0.01em; }
  .mobile-menu.open .mob-link { opacity: 1; transform: translateY(0); }
  .mobile-menu.open .mob-link:nth-child(1) { transition-delay: 0.06s; }
  .mobile-menu.open .mob-link:nth-child(2) { transition-delay: 0.12s; }
  .mobile-menu.open .mob-link:nth-child(3) { transition-delay: 0.18s; }
  .mobile-menu.open .mob-link:nth-child(4) { transition-delay: 0.24s; }
  .mob-link:hover { color: #c5bff5; }
  @media (max-width: 700px) { .hamburger { display: flex; } .nav-links { display: none; } }
  @media (max-width: 1024px) { .content-layout { grid-template-columns: 1fr; } .sidebar-left, .sidebar-right { display: none; } }
  @media (max-width: 700px) { nav { padding: 0 24px; } .wrap { padding: 0 24px; } .post-title { font-size: 2rem; } .hero-img { height: 300px; } }
  .footer-editorial { background: var(--black); color: white; padding: 72px 48px 48px; }
  .footer-top-bar { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto 80px; }
  .footer-cta-link { font-size: 0.85rem; font-weight: 500; color: #EAF58D; text-decoration: none; letter-spacing: 0.02em; display: flex; align-items: center; gap: 8px; transition: gap 0.2s ease; }
  .footer-cta-link:hover { gap: 14px; }
  .footer-big-phrase { max-width: 1200px; margin: 0 auto 80px; }
  .footer-big-phrase h2 { font-family: var(--serif); font-size: clamp(3.5rem, 8vw, 7rem); line-height: 1.0; color: white; font-weight: 400; margin: 0; }
  .footer-big-phrase h2 em { color: #c5bff5; font-style: italic; }
  .footer-divider { margin: 0 0 48px; height: 1px; background: rgba(255,255,255,0.1); }
  .footer-bottom-row { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 48px; align-items: start; }
  .footer-nav-group { display: flex; flex-direction: column; gap: 12px; }
  .footer-nav-label { font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.3; margin-bottom: 4px; }
  .footer-nav-group a { font-size: 0.85rem; color: white; text-decoration: none; opacity: 0.5; transition: opacity 0.2s; }
  .footer-nav-group a:hover { opacity: 1; }
  .footer-copy { display: flex; flex-direction: column; gap: 6px; font-size: 0.72rem; opacity: 0.25; text-align: right; align-self: end; }
</style>
<link rel="icon" type="image/png" href="Favicon (1).png">
</head>
<body>

<div class="progress-bar" id="progress"></div>

<nav>
  <div class="nav-inner">
    <a href="index.html" class="logo"><img src="Ana K. Logo-dark.svg" alt="Ana K." style="height:26px;display:block;"></a>
    <ul class="nav-links">
      <li><a href="index.html#about">About</a></li>
      <li><a href="index.html#work">Work</a></li>
      <li><a href="blog.html" class="active">Blog</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
    <button class="hamburger" id="hamburger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<div class="mobile-menu" id="mobile-menu">
  <a href="index.html#about" class="mob-link">About</a>
  <a href="index.html#work" class="mob-link">Work</a>
  <a href="blog.html" class="mob-link">Blog</a>
  <a href="contact.html" class="mob-link">Contact</a>
</div>

<div class="wrap">

  <a href="blog.html" class="back-link fade-up">← Back to blog</a>

  <div class="post-hero fade-up">
    <div class="post-meta-top">
      <span class="post-tag">${data.category || 'Design'}</span>
      <span class="meta-dot"></span>
      <span class="meta-item">${date}</span>
      <span class="meta-dot"></span>
      <span class="meta-item">${mins} min read</span>
    </div>
    <h1 class="post-title">${data.title}</h1>
    <p class="post-excerpt">${data.excerpt || ''}</p>
    <div class="author-row">
      <div class="author-avatar">A</div>
      <div>
        <div class="author-name">Ana Karina</div>
        <div class="author-role">Brand & Visual Identity Designer</div>
      </div>
    </div>
  </div>

  <div class="hero-img fade-up">
    ${heroImgHtml}
  </div>

  <div class="content-layout">

    <div class="sidebar-left fade-up">
      <p class="toc-label">Contents</p>
      <nav class="toc">
        ${tocHtml}
      </nav>
    </div>

    <article class="article-body fade-up">
      ${finalHtml}
    </article>

    <div class="sidebar-right fade-up">
      <p class="share-label">Share</p>
      <div class="share-links">
        <a href="#" class="share-link">↗ Twitter / X</a>
        <a href="https://www.linkedin.com/in/ana-karina-rosa-rosario-3b407199/?locale=en_US" target="_blank" class="share-link">↗ LinkedIn</a>
        <a href="#" class="share-link">↗ Copy link</a>
      </div>
    </div>

  </div>

</div>

<script>
  window.addEventListener('scroll', () => {
    const doc = document.documentElement;
    const scrolled = doc.scrollTop / (doc.scrollHeight - doc.clientHeight) * 100;
    document.getElementById('progress').style.width = scrolled + '%';
  });
  const sections = document.querySelectorAll('h2[id]');
  const tocItems = document.querySelectorAll('.toc-item');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        tocItems.forEach(t => t.classList.remove('active'));
        const active = document.querySelector('.toc-item[href="#' + e.target.id + '"]');
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(s => observer.observe(s));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.06 });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  window.addEventListener('load', () => {
    document.querySelectorAll('.fade-up').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
    });
  });
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('.mob-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
</script>

<footer class="footer-editorial">
  <div class="footer-top-bar">
    <span class="footer-logo"><img src="Ana K. Logo.svg" alt="Ana K." style="height:24px;display:block;"></span>
    <a href="contact.html" class="footer-cta-link">Start working together <span>→</span></a>
  </div>
  <div class="footer-big-phrase">
    <h2>Good design changes<br><em>everything.</em></h2>
  </div>
  <div class="footer-divider"></div>
  <div class="footer-bottom-row">
    <div class="footer-nav-group">
      <span class="footer-nav-label">Pages</span>
      <a href="index.html#about">About</a>
      <a href="index.html#work">Work</a>
      <a href="blog.html">Blog</a>
      <a href="contact.html">Contact</a>
    </div>
    <div class="footer-nav-group">
      <span class="footer-nav-label">Connect</span>
      <a href="#">Instagram</a>
      <a href="https://www.linkedin.com/in/ana-karina-rosa-rosario-3b407199/?locale=en_US" target="_blank">LinkedIn</a>
      <a href="https://www.behance.net/anarosa3" target="_blank">Behance</a>
      <a href="mailto:hello@anakdesign.com">Email</a>
    </div>
    <div class="footer-copy">
      <span>© 2026 Ana K.</span>
      <span>Designed & built by Ana K.</span>
    </div>
  </div>
</footer>

</body>
</html>`;
}

// Generate blog index cards HTML
function generateBlogCards(posts) {
  return posts.map((post, i) => {
    const { data, slug } = post;
    const date = formatDate(data.date);
    const mins = readTime(post.body);
    const delay = i > 0 ? ` style="transition-delay:${i * 0.08}s"` : '';
    const imgHtml = data.image
      ? `<img src="${data.image}" alt="${data.title}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div class="ph" style="background:#c4d0c8;width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>`;

    return `    <a href="posts/${slug}.html" class="post-card fade-up"${delay}>
      <div class="post-img">${imgHtml}</div>
      <div class="post-body">
        <span class="post-tag">${data.category || 'Design'}</span>
        <h3 class="post-title">${data.title}</h3>
        <p class="post-excerpt">${data.excerpt || ''}</p>
        <div class="post-meta">
          <span class="meta-item">${date}</span>
          <span class="meta-dot"></span>
          <span class="meta-item">${mins} min read</span>
        </div>
      </div>
    </a>`;
  }).join('\n');
}

// Main build function
function build() {
  const postsDir = path.join(__dirname, 'posts');
  const outputPostsDir = path.join(__dirname, 'posts');

  if (!fs.existsSync(postsDir)) {
    console.log('No posts folder found, skipping build.');
    return;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.log('No markdown posts found.');
    return;
  }

  const posts = files.map(file => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const { data, body } = parseFrontmatter(content);
    return { data, body, slug: getSlug(file) };
  }).sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

  // Generate individual post HTML files
  posts.forEach(post => {
    const html = generatePostHtml(post);
    fs.writeFileSync(path.join(outputPostsDir, `${post.slug}.html`), html);
    console.log(`✓ Generated posts/${post.slug}.html`);
  });

  // Generate cards snippet for blog.html injection
  const cardsHtml = generateBlogCards(posts);
  fs.writeFileSync(path.join(__dirname, '_generated-cards.html'), cardsHtml);
  console.log(`✓ Generated ${posts.length} blog cards`);
  console.log('Build complete!');
}

build();
