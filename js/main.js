/**
 * main.js
 * Mobile nav, smooth-scroll close, and rendering of dynamic
 * content (bio, schedule, media, projects, contact) from content.json.
 *
 * Shared across ALL pages (index.html, bio.html, schedule.html,
 * media.html, projects.html, contact.html). Every render function
 * checks whether its target elements exist before doing anything,
 * so a page only renders the sections it actually contains.
 */

document.addEventListener("DOMContentLoaded", async () => {

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Navigation must be initialized independently
  // from the content/i18n loading.
  setupNav();
  setupLangSwitch();
  setupScrollProgress();
  setupLightbox();
  setupHeaderScroll();

  try {
    await I18N.init();

    renderAll();
    I18N.setLang(I18N.getLang());

    setupScrollReveal();

    document.addEventListener("langchange", renderAll);

  } catch (error) {
    console.error("I18N initialization failed:", error);
  }
});

/* ---------------------------------------------------------------------
  Navigation (mobile menu)
--------------------------------------------------------------------- */
function setupNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("primaryNav");

  if (!toggle || !nav) return;

  function openMenu() {
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
  }

  function toggleMenu() {
    const isOpen = nav.classList.contains("is-open");

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggle.addEventListener("click", toggleMenu);

  /* Fechar ao clicar num link */
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  /* Fechar com Escape */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeMenu();
      toggle.focus();
    }
  });

  /* Se voltarmos para desktop, resetar o menu */
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900 && nav.classList.contains("is-open")) {
      closeMenu();
    }
  });
}

function setupLangSwitch() {
  document.querySelectorAll(".lang-switch__btn").forEach((btn) => {
    btn.addEventListener("click", () => I18N.setLang(btn.getAttribute("data-lang")));
  });
}

/* ---------------------------------------------------------------------
  Rendering — each function is a no-op if its elements aren't on the page
--------------------------------------------------------------------- */
function renderAll() {
  renderProjectsDetailed("projectsDetailed", "projectsEmpty");
  renderHero();
  renderBioTeaser();
  renderBio();
  renderVenues();
  renderSchedule();
  renderMedia();
  initMediaCarousel();
  renderPhotos();
  renderProjects("projectsGrid", "projectsEmpty");           // full projects page
  renderProjects("projectsPreviewGrid", "projectsPreviewEmpty", 3); // homepage preview
  renderContact();
  renderFloatingConcert();
  setupScheduleTabs();
  scrollToHashTarget();

}

function renderHero() {
  const eyebrow = document.querySelector('[data-i18n="hero.eyebrow"]');
  const tagline = document.querySelector('[data-i18n="hero.tagline"]');
  if (eyebrow) eyebrow.textContent = I18N.c("hero.eyebrow");
  if (tagline) tagline.textContent = I18N.c("hero.tagline");

  const img = document.getElementById("heroImage");
  if (img) img.alt = I18N.c("hero.image.alt");
}

function renderBioTeaser() {
  const el = document.getElementById("bioTeaser");
  if (!el) return;
  el.textContent = I18N.c("bioTeaser") || "";
}

function renderBio() {
  const el = document.getElementById("bioText");
  if (!el) return;
  const text = I18N.c("bio") || "";
  el.innerHTML = "";
  text.split(/\n\n+/).forEach((para) => {
    if (!para.trim()) return;
    const p = document.createElement("p");
    p.textContent = para.trim();
    el.appendChild(p);
  });
}

function renderVenues() {
  const list = document.getElementById("venuesList");
  if (!list) return;
  const venues = I18N.content?.venuesHighlight || [];
  list.innerHTML = "";
  venues.forEach((v) => {
    const li = document.createElement("li");
    li.textContent = v[I18N.getLang()] || v.en;
    list.appendChild(li);
  });
}

/* ---------------------------------------------------------------------
  Schedule — handles both dated events and "TBA" (year-only) events.
  A TBA event has { tba: true, year: <number> } instead of { date }.
--------------------------------------------------------------------- */
function renderSchedule() {
  const upcomingList = document.getElementById("scheduleList");
  const upcomingEmpty = document.getElementById("scheduleEmpty");
  const pastList = document.getElementById("schedulePastList");
  const pastEmpty = document.getElementById("schedulePastEmpty");
  if (!upcomingList || !upcomingEmpty) return;

  const items = I18N.content?.schedule || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  function getYear(item) {
    return item.tba ? item.year : new Date(item.date).getFullYear();
  }
  function getSortTime(item) {
    return item.tba ? Infinity : new Date(item.date).getTime();
  }
  function isUpcoming(item) {
    return item.tba ? item.year >= currentYear : new Date(item.date) >= today;
  }

  const upcoming = items
    .filter(isUpcoming)
    .sort((a, b) => getYear(a) - getYear(b) || getSortTime(a) - getSortTime(b));

  const past = items
    .filter((item) => !isUpcoming(item))
    .sort((a, b) => getYear(b) - getYear(a) || getSortTime(b) - getSortTime(a));

  upcomingList.innerHTML = "";
  appendGroupedByYear(upcomingList, upcoming);
  upcomingEmpty.hidden = upcoming.length > 0;
  upcomingEmpty.dataset.hasContent = String(upcoming.length === 0);

  if (pastList && pastEmpty) {
    pastList.innerHTML = "";
    appendGroupedByYear(pastList, past);
    pastEmpty.hidden = past.length > 0;
    pastEmpty.dataset.hasContent = String(past.length === 0);
  }
}

function appendGroupedByYear(container, items) {
  let currentYear = null;
  items.forEach((item) => {
    const year = item.tba ? item.year : new Date(item.date).getFullYear();
    if (year !== currentYear) {
      currentYear = year;
      const yearHeader = document.createElement("li");
      yearHeader.className = "schedule-year";
      yearHeader.textContent = year;
      container.appendChild(yearHeader);
    }
    container.appendChild(buildScheduleItem(item));
  });
}

function buildScheduleItem(item) {
  const li = document.createElement("li");
  li.className = "schedule-item";

  const { day, month } = item.tba
    ? { day: "—", month: I18N.t("scheduleTBA") }
    : formatDateParts(item.date, I18N.getLang());

  const dateBox = document.createElement("div");
  dateBox.className = "schedule-item__datebox";

  const dayMonthEl = document.createElement("span");
  dayMonthEl.className = "schedule-item__daymonth";
  dayMonthEl.textContent = `${day} ${month}`;
  dateBox.appendChild(dayMonthEl);

  if (item.time) {
    const timeEl = document.createElement("span");
    timeEl.className = "schedule-item__time";
    timeEl.textContent = pickLang(item.time);
    dateBox.appendChild(timeEl);
  }

  const info = document.createElement("div");
  info.className = "schedule-item__info";

  const title = document.createElement("p");
  title.className = "schedule-item__title";
  title.textContent = pickLang(item.title);
  info.appendChild(title);

const venue = pickLang(item.venue);
const city = pickLang(item.city);
const country = pickLang(item.country);

const venueLine = [
  [venue, city].filter(Boolean).join(", "),
  country
].filter(Boolean).join(" | ");

if (venueLine) {
  const venueEl = document.createElement("p");

  venueEl.className = "schedule-item__venue";
  venueEl.textContent = venueLine;

  info.appendChild(venueEl);
}

  if (item.program) {
    const program = document.createElement("p");
    program.className = "schedule-item__program";
    program.textContent = pickLang(item.program);
    info.appendChild(program);
  }

  li.appendChild(dateBox);
  li.appendChild(info);
  return li;
}

function setupScheduleTabs() {
  const tabUpcoming = document.getElementById("tabUpcoming");
  const tabPast = document.getElementById("tabPast");
  const listUpcoming = document.getElementById("scheduleList");
  const emptyUpcoming = document.getElementById("scheduleEmpty");
  const listPast = document.getElementById("schedulePastList");
  const emptyPast = document.getElementById("schedulePastEmpty");

  if (
    !tabUpcoming ||
    !tabPast ||
    !listUpcoming ||
    !listPast ||
    !emptyUpcoming ||
    !emptyPast
  ) {
    return;
  }

  function showUpcoming() {
    tabUpcoming.classList.add("is-active");
    tabPast.classList.remove("is-active");

    listUpcoming.hidden = false;
    listPast.hidden = true;

    emptyUpcoming.hidden = listUpcoming.children.length > 0;
    emptyPast.hidden = true;
  }

  function showPast() {
    tabPast.classList.add("is-active");
    tabUpcoming.classList.remove("is-active");

    listUpcoming.hidden = true;
    listPast.hidden = false;

    emptyUpcoming.hidden = true;
    emptyPast.hidden = listPast.children.length > 0;
  }

  tabUpcoming.onclick = showUpcoming;
  tabPast.onclick = showPast;

  // Estado inicial
  showUpcoming();
}

function renderFloatingConcert() {
  const navigation = performance.getEntriesByType("navigation")[0];

  if (
    navigation?.type !== "reload" &&
    sessionStorage.getItem("floatingConcertDismissed") === "1"
  ) {
    return;
  }

  if (navigation?.type === "reload") {
    sessionStorage.removeItem("floatingConcertDismissed");
  }

  const items = I18N.content?.schedule || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = items
    .filter((item) => item.date && new Date(item.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (upcoming.length === 0) return;
  const next = upcoming[0];

  const existing = document.getElementById("floatingConcert");
  if (existing) existing.remove();

  const { day, month } = formatDateParts(next.date, I18N.getLang());

  const card = document.createElement("div");
  card.className = "floating-concert";
  card.id = "floatingConcert";

  const badge = document.createElement("div");
  badge.className = "floating-concert__badge";

  const badgeMonth = document.createElement("span");
  badgeMonth.className = "floating-concert__badge-month";
  badgeMonth.textContent = month;

  const badgeDay = document.createElement("span");
  badgeDay.className = "floating-concert__badge-day";
  badgeDay.textContent = day;

  badge.appendChild(badgeMonth);
  badge.appendChild(badgeDay);

  const info = document.createElement("div");
  info.className = "floating-concert__info";

  const label = document.createElement("p");
  label.className = "floating-concert__label";
  label.textContent = I18N.t("nextConcertLabel");

  const title = document.createElement("p");
  title.className = "floating-concert__venue";
  title.textContent = pickLang(next.title);

  const program = document.createElement("p");
  program.className = "floating-concert__program";
  program.textContent = pickLang(next.program);

  const link = document.createElement("a");
  link.className = "floating-concert__link";
  link.href = "/schedule";
  link.textContent = I18N.t("viewSchedule");

  info.appendChild(label);
  info.appendChild(title);
  if (next.program) info.appendChild(program);
  info.appendChild(link);

  const closeBtn = document.createElement("button");
  closeBtn.className = "floating-concert__close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";

  closeBtn.addEventListener("click", () => {
    card.remove();
    sessionStorage.setItem("floatingConcertDismissed", "1");
  });

  card.appendChild(badge);
  card.appendChild(info);
  card.appendChild(closeBtn);

  document.body.appendChild(card);
}

function formatDateParts(dateStr, lang) {
  const iso = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
  const date = new Date(iso);
  const day = date.getDate();
  const month = date.toLocaleDateString(lang, { month: "short" }).replace(".", "");
  return { day, month };
}

function extractYouTubeId(embedUrl) {
  const match = /\/embed\/([^?&]+)/.exec(embedUrl || "");
  return match ? match[1] : null;
}

function renderMedia() {
  const player = document.getElementById("mediaPlayer");
  const nowPlaying = document.getElementById("mediaNowPlaying");
  const playlist = document.getElementById("mediaPlaylist");
  const emptyState = document.getElementById("mediaEmpty");
  if (!player || !nowPlaying || !playlist || !emptyState) return;

  const items = I18N.content?.media || [];
  playlist.innerHTML = "";

  if (items.length === 0) {
    emptyState.hidden = false;
    player.innerHTML = "";
    nowPlaying.innerHTML = "";
    return;
  }
  emptyState.hidden = true;

  showFeaturedMedia(items[0]);

  items.forEach((item, index) => {
    const id = extractYouTubeId(item.embedUrl);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "media-playlist__item";
    if (index === 0) card.classList.add("is-active");

    if (id) {
      const img = document.createElement("img");
      img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      img.loading = "lazy";
      img.alt = "";
      card.appendChild(img);
    }

    const scrim = document.createElement("span");
    scrim.className = "media-playlist__scrim";
    card.appendChild(scrim);

    const title = document.createElement("span");
    title.className = "media-playlist__title";
    title.textContent = pickLang(item.title);
    card.appendChild(title);

    card.addEventListener("click", () => {
      showFeaturedMedia(item);
      playlist.querySelectorAll(".media-playlist__item").forEach((el) => el.classList.remove("is-active"));
      card.classList.add("is-active");
    });

    playlist.appendChild(card);
  });
}

function showFeaturedMedia(item) {
  const player = document.getElementById("mediaPlayer");
  const nowPlaying = document.getElementById("mediaNowPlaying");
  if (!player || !nowPlaying) return;

  player.innerHTML = "";
  nowPlaying.innerHTML = "";
  if (!item) return;

  const id = extractYouTubeId(item.embedUrl);

  if (id) {
    const poster = document.createElement("button");
    poster.type = "button";
    poster.className = "media-player__poster";
    poster.setAttribute("aria-label", "Play video");

    const img = document.createElement("img");
    img.src = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    img.loading = "lazy";
    img.alt = "";
    img.onerror = () => {
      img.onerror = null;
      img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    };
    poster.appendChild(img);

    const scrim = document.createElement("span");
    scrim.className = "media-player__scrim";
    poster.appendChild(scrim);

    const playIcon = document.createElement("span");
    playIcon.className = "media-player__play";
    playIcon.innerHTML = `
      <svg viewBox="0 0 24 24" width="60" height="60" fill="none">
        <circle cx="12" cy="12" r="11" fill="#b8874f" />
        <path d="M10 8.5v7l6-3.5-6-3.5z" fill="#fffdf9" />
      </svg>
    `;
    poster.appendChild(playIcon);

    poster.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `${item.embedUrl}?autoplay=1`;
      iframe.loading = "lazy";
      iframe.title = pickLang(item.title);
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      player.innerHTML = "";
      player.appendChild(iframe);
    });

    player.appendChild(poster);
  }

  const title = document.createElement("p");
  title.className = "media-nowplaying__title";

  const rule = document.createElement("span");
  rule.className = "media-nowplaying__title-rule";
  rule.setAttribute("aria-hidden", "true");
  title.appendChild(rule);

  const titleText = document.createElement("span");
  titleText.textContent = pickLang(item.title);
  title.appendChild(titleText);

  nowPlaying.appendChild(title);
}

function renderPhotos() {
  const grid = document.getElementById("galleryGrid");
  const emptyState = document.getElementById("galleryEmpty");
  if (!grid || !emptyState) return;

  const items = I18N.content?.photos || [];
  grid.innerHTML = "";

  if (items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  items.forEach((item, index) => {
    const fig = document.createElement("figure");
    fig.className = "photo-grid__item";
    if (item.tall) fig.classList.add("photo-grid__item--tall");

    const img = document.createElement("img");
    img.src = item.src;
    img.loading = "lazy";
    img.alt = pickLang(item.alt) || "";
    fig.appendChild(img);

    fig.addEventListener("click", () => openLightbox(items, index));
    fig.style.cursor = "zoom-in";

    grid.appendChild(fig);
  });
}

let lightboxItems = [];
let lightboxIndex = 0;

function openLightbox(items, index) {
  lightboxItems = items;
  lightboxIndex = index;
  showLightboxImage();

  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function showLightboxImage() {
  const img = document.getElementById("lightboxImage");
  if (!img || !lightboxItems.length) return;
  const item = lightboxItems[lightboxIndex];
  img.src = item.src;
  img.alt = pickLang(item.alt) || "";
}

function showLightboxPrev() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
  showLightboxImage();
}

function showLightboxNext() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
  showLightboxImage();
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImage");
  if (!lightbox) return;
  lightbox.hidden = true;
  if (img) img.src = "";
  document.body.classList.remove("lightbox-open");
}

function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const closeBtn = document.getElementById("lightboxClose");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  if (!lightbox || !closeBtn || !prevBtn || !nextBtn) return;

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", showLightboxPrev);
  nextBtn.addEventListener("click", showLightboxNext);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showLightboxPrev();
    if (event.key === "ArrowRight") showLightboxNext();
  });
}

/**
 * Renders the projects grid into the given container IDs.
 * @param {string} gridId - id of the grid element
 * @param {string} emptyId - id of the empty-state element
 * @param {number} [limit] - optional max number of items (used for homepage preview)
 */
function renderProjects(gridId, emptyId, limit) {
  const grid = document.getElementById(gridId);
  const emptyState = document.getElementById(emptyId);
  if (!grid || !emptyState) return;

  let items = I18N.content?.projects || [];
  if (limit) items = items.slice(0, limit);
  grid.innerHTML = "";

  if (items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  items.forEach((item) => {
    const card = document.createElement("a");
    card.className = "project-card";
    card.href = `/projects#${slugify(item.title?.en || pickLang(item.title))}`;

    const media = document.createElement("div");
    media.className = "project-card__media";

    if (item.image) {
      const img = document.createElement("img");
      img.className = "project-card__image";
      img.src = item.image;
      img.alt = "";
      img.loading = "lazy";
      media.appendChild(img);
    }

    const scrim = document.createElement("div");
    scrim.className = "project-card__scrim";
    media.appendChild(scrim);

    const title = document.createElement("h3");
    title.className = "project-card__title";
    title.textContent = pickLang(item.title);
    media.appendChild(title);

    card.appendChild(media);

    const caption = document.createElement("div");
    caption.className = "project-card__caption";

    if (item.instrumentation) {
      const eyebrow = document.createElement("p");
      eyebrow.className = "project-card__eyebrow";
      eyebrow.textContent = pickLang(item.instrumentation);
      caption.appendChild(eyebrow);
    }

    if (item.collaborator) {
      const meta = document.createElement("p");
      meta.className = "project-card__meta";
      meta.textContent = pickLang(item.collaborator);
      caption.appendChild(meta);
    }

    card.appendChild(caption);
    grid.appendChild(card);
  });
}

function renderProjectsDetailed(containerId, emptyId) {
  const container = document.getElementById(containerId);
  const emptyState = document.getElementById(emptyId);
  if (!container || !emptyState) return;

  const items = I18N.content?.projects || [];
  container.innerHTML = "";

  if (items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  items.forEach((item) => {
    const block = document.createElement("article");
    block.className = "project-block";
    block.id = slugify(item.title?.en || pickLang(item.title))

    const title = document.createElement("h3");
    title.className = "project-block__title";
    title.textContent = pickLang(item.title);
    block.appendChild(title);

    if (item.image) {
      const img = document.createElement("img");
      img.className = "project-block__image";
      img.src = item.image;
      img.alt = "";
      img.loading = "lazy";
      block.appendChild(img);
    }

    const textWrap = document.createElement("div");
    textWrap.className = "project-block__text-wrap";

    if (item.description) {
      const p = document.createElement("p");
      p.className = "project-block__text";
      p.textContent = pickLang(item.description);
      textWrap.appendChild(p);
    }

    if (item.link && item.link.url) {
      const a = document.createElement("a");
      a.className = "text-link";
      a.href = item.link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const span = document.createElement("span");
      span.textContent = pickLang(item.link.label) || "Learn more";
      const line = document.createElement("span");
      line.className = "text-link__line";
      line.setAttribute("aria-hidden", "true");
      a.appendChild(span);
      a.appendChild(line);
      textWrap.appendChild(a);
    }

    block.appendChild(textWrap);
    container.appendChild(block);
  });
}

function renderContact() {
  const el = document.getElementById("contactDetails");
  if (!el) return;

  const contact = I18N.content?.contact || {};
  const lang = I18N.getLang();

  el.innerHTML = "";

  // -------------------------------------------------------------------------
  // EMAIL
  // -------------------------------------------------------------------------

  const emailBlock = document.createElement("div");
  emailBlock.className = "contact__block";

  const emailTitle = document.createElement("h2");
  emailTitle.className = "contact__label";

  emailTitle.textContent =
    lang === "de" ? "E-Mail" : "Email";

  emailBlock.appendChild(emailTitle);

  if (contact.email) {
    const emailLink = document.createElement("a");

    emailLink.className = "contact__email";
    emailLink.href = `mailto:${contact.email}`;
    emailLink.textContent = contact.email;

    emailBlock.appendChild(emailLink);
  }

  el.appendChild(emailBlock);

  // -------------------------------------------------------------------------
  // SOCIAL MEDIA
  // -------------------------------------------------------------------------

  if (contact.social && contact.social.length) {
    const socialBlock = document.createElement("div");
    socialBlock.className = "contact__block contact__block--social";

    const socialTitle = document.createElement("h2");
    socialTitle.className = "contact__label";

    if (lang === "es") {
      socialTitle.textContent = "Redes sociales";
    } else if (lang === "de") {
      socialTitle.textContent = "Soziale Medien";
    } else {
      socialTitle.textContent = "Social media";
    }

    socialBlock.appendChild(socialTitle);

    const socialLinks = document.createElement("div");
    socialLinks.className = "contact__social-links";

    contact.social.forEach((item) => {
      const socialItem = document.createElement("div");
      socialItem.className = "contact__social-item";

      const link = document.createElement("a");

      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      link.setAttribute("aria-label", item.label);
      link.setAttribute("title", item.label);

      // Instagram
      if (item.label === "Instagram") {
        link.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            />
            <circle
              cx="12"
              cy="12"
              r="4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            />
            <circle
              cx="17.5"
              cy="6.5"
              r="1"
              fill="currentColor"
            />
          </svg>
        `;
      }

      // Facebook
      if (item.label === "Facebook") {
        link.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 8h3V4.5h-3c-3 0-5 2-5 5.2V12H6v3.5h3V21h4v-5.5h3.2L17 12H13V9.8C13 8.6 13.3 8 14 8Z"
              fill="currentColor"
            />
          </svg>
        `;
      }

      // YouTube
      if (item.label === "YouTube") {
        link.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M21 7.2a2.8 2.8 0 0 0-2-2C17.2 4.7 12 4.7 12 4.7s-5.2 0-7 .5a2.8 2.8 0 0 0-2 2C2.5 9 2.5 12 2.5 12s0 3 .5 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7 .5 7 .5s5.2 0 7-.5a2.8 2.8 0 0 0 2-2c.5-1.8-.5-4.8-.5-4.8s0-3-.5-4.8Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="m10 9 5 3-5 3V9Z"
              fill="currentColor"
            />
          </svg>
        `;
      }

      const name = document.createElement("span");
      name.className = "contact__social-name";
      name.textContent = item.label;

      socialItem.appendChild(link);
      socialItem.appendChild(name);

      socialLinks.appendChild(socialItem);
    });

    socialBlock.appendChild(socialLinks);
    el.appendChild(socialBlock);
  }
}


/* ---------------------------------------------------------------------
  Helpers
--------------------------------------------------------------------- */
function pickLang(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[I18N.getLang()] || field.en || "";
}

function slugify(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function setupScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = percent + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
}

function setupHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  function updateHeaderState() {
    if (window.scrollY > 20) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }

  window.addEventListener("scroll", updateHeaderState, { passive: true });
  updateHeaderState();
}

function setupScrollReveal() {
  const selectors = [
    ".bio-teaser__text",
    ".section--bio-teaser .text-link",
    ".project-card",
    ".project-block",
    ".media-playlist__item",
    ".schedule-item",
    ".bio__text > p",
    ".venues",
    ".contact__details",
  ];
  const targets = document.querySelectorAll(selectors.join(","));
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  targets.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${Math.min(i % 6, 5) * 0.06}s`;
    observer.observe(el);
  });
}

function scrollToHashTarget() {
  if (!window.location.hash) return;
  const el = document.getElementById(window.location.hash.slice(1));
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function initMediaCarousel() {
  const playlist = document.querySelector(".media-playlist");

  if (!playlist || playlist.dataset.carouselReady === "true") return;

  playlist.dataset.carouselReady = "true";

  const wrap = document.createElement("div");
  wrap.className = "media-playlist-wrap";

  playlist.parentNode.insertBefore(wrap, playlist);
  wrap.appendChild(playlist);

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "media-carousel-arrow media-carousel-arrow--prev";
  prev.setAttribute("aria-label", "Previous video");

  prev.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 5L7.5 12L14.5 19"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
  `;

  const next = document.createElement("button");
  next.type = "button";
  next.className = "media-carousel-arrow media-carousel-arrow--next";
  next.setAttribute("aria-label", "Next video");

  next.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.5 5L16.5 12L9.5 19"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
  `;

  wrap.appendChild(prev);
  wrap.appendChild(next);

  const updateArrows = () => {
    const maxScroll = playlist.scrollWidth - playlist.clientWidth;

    prev.disabled = playlist.scrollLeft <= 2;
    next.disabled = playlist.scrollLeft >= maxScroll - 2;
  };

  const scrollAmount = () => {
    const item = playlist.querySelector(".media-playlist__item");

    if (!item) return playlist.clientWidth * 0.8;

    return item.getBoundingClientRect().width + 16;
  };

  prev.addEventListener("click", () => {
    playlist.scrollBy({
      left: -scrollAmount(),
      behavior: "smooth"
    });
  });

  next.addEventListener("click", () => {
    playlist.scrollBy({
      left: scrollAmount(),
      behavior: "smooth"
    });
  });

  playlist.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);

  updateArrows();
}
