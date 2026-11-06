/* ==========================================================
   Mottainai Connect — Receive / Buy page (もらう／買う)
   Search, filtering and product-card rendering.

   - Only READS the existing product arrays (products, clothingProducts, ...).
   - Does not change any product file, Firebase file or other page.
   - Everything lives inside one function, so no global name clashes.
   ========================================================== */
(() => {
  "use strict";

  const API_URL = "https://dozo-xslw.onrender.com";

  /* ========================================================
     1. SETTINGS  (the only part you should ever need to edit)
     ======================================================== */

  // Each product file declares its array with a top-level `const`.
  // Top-level const values are NOT on `window`, but they ARE visible by
  // name to later <script> tags — so we read them by name here.
  // `typeof x` is safe even if a file failed to load.
  const PRODUCT_SOURCES = [
    {
      key: "electronics",
      read: () => (typeof products !== "undefined" ? products : null),
    },
    {
      key: "clothing",
      read: () =>
        typeof clothingProducts !== "undefined" ? clothingProducts : null,
    },
    {
      key: "books",
      read: () => (typeof booksProducts !== "undefined" ? booksProducts : null),
    },
    {
      key: "household",
      read: () =>
        typeof householdProducts !== "undefined" ? householdProducts : null,
    },
    {
      key: "toy",
      read: () => (typeof toysProducts !== "undefined" ? toysProducts : null),
    },
    {
      key: "furniture",
      read: () =>
        typeof furnitureProducts !== "undefined" ? furnitureProducts : null,
    },
    {
      key: "bedding",
      read: () =>
        typeof beddingProducts !== "undefined" ? beddingProducts : null,
    },
    {
      key: "sports",
      read: () =>
        typeof sportsProducts !== "undefined" ? sportsProducts : null,
    },
    {
      key: "hobby",
      read: () => (typeof hobbyProducts !== "undefined" ? hobbyProducts : null),
    },
    {
      key: "indoor",
      read: () =>
        typeof indoorProducts !== "undefined" ? indoorProducts : null,
    },
  ];

  // Words used when searching by category (Japanese + English).
  const CATEGORY_INFO = {
    electronics: { words: "electronics 家電 電子機器 ガジェット" },
    clothing: { words: "clothing 衣類 服 洋服 アクセサリー" },
    books: { words: "books 本 書籍 教材" },
    household: { words: "household 日用品 キッチン 食器" },
    toy: { words: "toy toys おもちゃ ベビー用品" },
    furniture: { words: "furniture 家具 インテリア" },
    bedding: { words: "bedding 寝具 布団 ホームテキスタイル" },
    sports: { words: "sports スポーツ フィットネス" },
    hobby: { words: "hobby 趣味 手芸 クラフト" },
    indoor: { words: "indoor plants 観葉植物 植物 ガーデニング" },
  };

  // If a product says category "toys" or "gardening", treat it as the key above.
  const CATEGORY_ALIASES = {
    toys: "toy",
    gardening: "indoor",
    plants: "indoor",
    "indoor-plants": "indoor",
  };

  // Image folder: images/<folder>/<image>.
  // Default is the product's own category. If your folder names differ,
  // set them here, e.g.  { indoor: "gardening", toy: "toys" }
  const IMAGE_FOLDER_OVERRIDES = {};
  // Tried in order if the first image path fails to load.
  const IMAGE_FOLDER_FALLBACKS = {
    toy: ["toys"],
    indoor: ["gardening", "plants"],
  };

  // Price filter values from the HTML <select>  ->  [min, max]
  const PRICE_RANGES = {
    free: [0, 0],
    "1-1000": [1, 1000],
    "1001-5000": [1001, 5000],
    "5001-10000": [5001, 10000],
    "10001-20000": [10001, 20000],
    "20001-max": [20001, Infinity],
  };

  const CONDITION_LABELS = { new: "新品・未使用", good: "良好", used: "中古" };
  const MAX_SUGGESTIONS = 8;

  /* ========================================================
     2. SMALL HELPERS
     ======================================================== */

  const $ = (id) => document.getElementById(id);

  // Makes text easy to compare: full-width → half-width, lower case,
  // katakana → hiragana (so "イス" and "いす" match).
  function norm(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u30a1-\u30f6]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60),
      )
      .trim();
  }

  // 30000 -> 30000, "¥1,500" -> 1500, "無料" -> 0, missing -> null
  function parsePrice(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    if (/無料|free/i.test(value)) return 0;
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  }

  // Turns any condition text (Japanese or English) into "new" | "good" | "used" | "".
  function conditionGroup(raw) {
    const t = norm(raw);
    if (!t) return "";
    if (/新品同様|like ?new|良好|good|excellent|美品/.test(t)) return "good";
    if (/新品|未使用|未開封|brand ?new|^new$|unused/.test(t)) return "new";
    if (/中古|used|second|fair|使用感|傷/.test(t)) return "used";
    return "";
  }

  function formatPrice(price) {
    if (price === null) return "価格未設定";
    return price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`;
  }

  /* ========================================================
     3. PRODUCT CATALOG
     ======================================================== */

  let catalog = []; // every normalized product
  const seenKeys = new Set(); // prevents the same product being added twice
  let areaIndex = []; // [{ label, norm, count }] built from real data

  // Converts one raw product object into a clean, searchable object.
  function normalizeProduct(raw, sourceKey) {
    if (!raw || typeof raw !== "object") return null;

    const categoryRaw = String(raw.category || sourceKey || "").trim();
    const lower = categoryRaw.toLowerCase();
    const categoryKey = CATEGORY_ALIASES[lower] || lower;

    const hasId = raw.id !== undefined && raw.id !== null && raw.id !== "";
    const title = String(raw.title ?? raw.name ?? "").trim();
    const details = String(raw.details ?? raw.description ?? "").trim();
    const location = String(raw.location ?? "").trim(); // never invented
    const condition = String(raw.condition ?? "").trim();

    return {
      key: `${sourceKey === "backend" ? "backend:" : ""}${categoryKey}:${raw.id}`,
      hasId,
      id: raw.id,
      categoryRaw, // used in the details URL exactly as stored
      categoryKey, // used by the category filter
      title,
      details,
      price: parsePrice(raw.price),
      location,
      locationNorm: norm(location),
      condition,
      conditionGroup: conditionGroup(condition),
      image: raw.image,
      image_url: raw.image_url || "",
      images: Array.isArray(raw.images) ? raw.images : [],
      searchMain: norm(`${title} ${details}`),
      searchCategory: norm(
        CATEGORY_INFO[categoryKey]
          ? CATEGORY_INFO[categoryKey].words
          : categoryRaw,
      ),
    };
  }

  function addToCatalog(list, sourceKey) {
    let added = 0;
    for (const raw of list) {
      const product = normalizeProduct(raw, sourceKey);
      if (!product) continue;
      if (product.hasId) {
        if (seenKeys.has(product.key)) continue; // skip duplicates
        seenKeys.add(product.key);
      }
      catalog.push(product);
      added++;
    }
    return added;
  }

  function loadStaticProducts() {
    const missing = [];
    for (const source of PRODUCT_SOURCES) {
      const list = source.read();
      if (Array.isArray(list)) addToCatalog(list, source.key);
      else missing.push(source.key);
    }
    if (missing.length) {
      console.warn(
        "[receive-search] Product list not found for:",
        missing.join(", "),
        "— check the file name and that it loads before receive-search.js.",
      );
    }
  }

  // Load products from Node.js Backend API
  async function loadBackendProducts() {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.products)) {
        throw new Error("Invalid Backend Product Data");
      }

      // Add Backend products to the existing catalog
      const added = addToCatalog(data.products, "backend");

      // Update location suggestions and product display
      buildAreaIndex();
      render();

      console.log("Backend Products Loaded:", added);
      console.log("Total Products:", catalog.length);
    } catch (error) {
      console.error("Backend Product Loading Error:", error);
    }
  }

  // Builds the list of area suggestions from the actual products.
  function buildAreaIndex() {
    const map = new Map();
    for (const p of catalog) {
      if (!p.location) continue;
      const entry = map.get(p.location) || {
        label: p.location,
        norm: p.locationNorm,
        count: 0,
      };
      entry.count++;
      map.set(p.location, entry);
    }
    areaIndex = [...map.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"),
    );
  }

  /* ========================================================
     4. FILTERING
     ======================================================== */

  const el = {
    form: $("rc-search-form"),
    keyword: $("rc-keyword"),
    keywordClear: $("rc-keyword-clear"),
    area: $("rc-area"),
    areaClear: $("rc-area-clear"),
    areaField: $("rc-area-field"),
    areaList: $("rc-area-list"),
    category: $("rc-category"),
    price: $("rc-price"),
    condition: $("rc-condition"),
    reset: $("rc-reset"),
    results: $("rc-results"),
    count: $("rc-count"),
    grid: $("rc-grid"),
    empty: $("rc-empty"),
    emptyReset: $("rc-empty-reset"),
    dataError: $("rc-data-error"),
  };

  function readFilters() {
    return {
      keyword: el.keyword.value,
      area: el.area.value,
      category: el.category.value,
      price: el.price.value,
      condition: el.condition.value,
    };
  }

  function matches(p, f, terms, areaText) {
    // Keyword: every word must match the title, description or category words.
    for (const term of terms) {
      const inText = p.searchMain.includes(term);
      const inCategory = term.length >= 2 && p.searchCategory.includes(term);
      if (!inText && !inCategory) return false;
    }

    // Area: products with no location never match an active area filter.
    if (areaText && (!p.locationNorm || !p.locationNorm.includes(areaText)))
      return false;

    if (f.category !== "all" && p.categoryKey !== f.category) return false;

    if (f.price !== "all") {
      const range = PRICE_RANGES[f.price];
      if (
        range &&
        (p.price === null || p.price < range[0] || p.price > range[1])
      )
        return false;
    }

    if (f.condition !== "all" && p.conditionGroup !== f.condition) return false;

    return true;
  }

  function filterProducts(f) {
    const terms = norm(f.keyword).split(/\s+/).filter(Boolean);
    const areaText = norm(f.area);
    return catalog.filter((p) => matches(p, f, terms, areaText));
  }

  /* ========================================================
     5. PRODUCT CARDS
     ======================================================== */

  // All image paths worth trying, in order.
  function imageCandidates(p) {
    const files = [
      ...(Array.isArray(p.images) ? p.images : []),
      p.image_url,
      p.image,
    ];

    const candidates = [];

    for (const item of files) {
      const file = String(item ?? "").trim();

      if (!file || file.includes("..")) continue;

      // Supabase URL
      if (/^https?:\/\//i.test(file)) {
        candidates.push(file);
        continue;
      }

      // Backend local image URL
      if (file.startsWith("/")) {
        candidates.push(`https://dozo-xslw.onrender.com${file}`);
        continue;
      }

      // Existing image path
      if (file.includes("/")) {
        candidates.push(file);
        continue;
      }

      // Existing static image folders
      const folders = [
        IMAGE_FOLDER_OVERRIDES[p.categoryKey],
        p.categoryRaw,
        p.categoryKey,
        ...(IMAGE_FOLDER_FALLBACKS[p.categoryKey] || []),
      ].filter(Boolean);

      folders.forEach((folder) => {
        candidates.push(
          `images/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`,
        );
      });
    }

    return [...new Set(candidates)];
  }

  // Loads the first image that works; shows a tidy placeholder if none do.
  function attachImage(img, media, candidates) {
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) {
        img.remove();
        media.classList.add("rc-no-image");
        return;
      }
      img.src = candidates[index++];
    };
    img.addEventListener("error", tryNext);
    tryNext();
  }

  function createCard(p) {
    const article = document.createElement("article");
    article.className = "rc-card";

    // Link to the EXISTING details page: product-details.html?category=...&id=...
    let wrapper;
    if (p.hasId) {
      wrapper = document.createElement("a");
      wrapper.className = "rc-card-link";
      const query = new URLSearchParams({
        category: p.categoryRaw,
        id: String(p.id),
      });
      wrapper.href = `product-details.html?${query.toString()}`;
    } else {
      wrapper = document.createElement("div"); // no id = no details page to open
      wrapper.className = "rc-card-link";
    }

    // Image
    const media = document.createElement("div");
    media.className = "rc-card-media";
    const img = document.createElement("img");
    img.alt = p.title || "商品画像";
    img.loading = "lazy";
    img.decoding = "async";
    media.append(img);
    attachImage(img, media, imageCandidates(p));

    if (p.price === 0) {
      const badge = document.createElement("span");
      badge.className = "rc-badge-free";
      badge.textContent = "無料";
      media.append(badge);
    }

    // Text
    const body = document.createElement("div");
    body.className = "rc-card-body";

    const title = document.createElement("h3");
    title.className = "rc-card-title";
    title.textContent = p.title || "商品名なし";

    const price = document.createElement("p");
    price.className = "rc-card-price" + (p.price === 0 ? " is-free" : "");
    price.textContent = formatPrice(p.price);

    const location = document.createElement("p");
    location.className = "rc-card-location";
    location.textContent = `📍 ${p.location || "エリア未登録"}`;

    const tags = document.createElement("ul");
    tags.className = "rc-card-tags";
    const tag = document.createElement("li");
    tag.className = "rc-tag";
    if (p.conditionGroup) {
      tag.textContent = CONDITION_LABELS[p.conditionGroup];
    } else if (p.condition) {
      tag.textContent = p.condition; // unknown wording: show it as written
    } else {
      tag.textContent = "状態未登録";
      tag.classList.add("is-muted");
    }
    tags.append(tag);

    body.append(title, price, location, tags);

    if (p.hasId) {
      const button = document.createElement("span");
      button.className = "rc-card-btn";
      button.textContent = "詳細を見る →";
      body.append(button);
    }

    wrapper.append(media, body);
    article.append(wrapper);
    return article;
  }

  /* ========================================================
     6. RENDER
     ======================================================== */

  function render() {
    const filters = readFilters();
    const result = filterProducts(filters);

    const fragment = document.createDocumentFragment();
    for (const p of result) fragment.append(createCard(p));
    el.grid.replaceChildren(fragment);

    const noData = catalog.length === 0;
    el.count.textContent = result.length
      ? `${result.length.toLocaleString("ja-JP")}件の商品が見つかりました`
      : "条件に一致する商品が見つかりませんでした。";
    el.empty.hidden = noData || result.length > 0;
    el.dataError.hidden = !noData;

    el.keywordClear.hidden = !filters.keyword;
    el.areaClear.hidden = !filters.area;

    syncUrl(filters);
  }

  /* ========================================================
     7. URL SYNC  (so the Back button from a details page keeps your search)
     ======================================================== */

  function syncUrl(f) {
    const params = new URLSearchParams();
    if (f.keyword.trim()) params.set("q", f.keyword.trim());
    if (f.area.trim()) params.set("area", f.area.trim());
    if (f.category !== "all") params.set("category", f.category);
    if (f.price !== "all") params.set("price", f.price);
    if (f.condition !== "all") params.set("condition", f.condition);
    const qs = params.toString();
    try {
      history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : ""));
    } catch (e) {
      /* some browsers block this on file:// — harmless */
    }
  }

  function setSelect(select, value) {
    if (value && [...select.options].some((o) => o.value === value))
      select.value = value;
  }

  function restoreFromUrl() {
    const params = new URLSearchParams(location.search);
    el.keyword.value = params.get("q") || "";
    el.area.value = params.get("area") || "";
    setSelect(el.category, params.get("category"));
    setSelect(el.price, params.get("price"));
    setSelect(el.condition, params.get("condition"));
  }

  /* ========================================================
     8. AREA SUGGESTIONS
     ======================================================== */

  let suggestions = [];
  let activeIndex = -1;

  function openSuggestions() {
    el.areaList.hidden = false;
    el.area.setAttribute("aria-expanded", "true");
  }

  function closeSuggestions() {
    el.areaList.hidden = true;
    el.area.setAttribute("aria-expanded", "false");
    el.area.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  }

  function setActive(index) {
    const items = el.areaList.children;
    if (activeIndex >= 0 && items[activeIndex])
      items[activeIndex].classList.remove("is-active");
    activeIndex = index;
    if (index >= 0 && items[index]) {
      items[index].classList.add("is-active");
      items[index].scrollIntoView({ block: "nearest" });
      el.area.setAttribute("aria-activedescendant", items[index].id);
    } else {
      el.area.removeAttribute("aria-activedescendant");
    }
  }

  function updateSuggestions() {
    const q = norm(el.area.value);
    let list = q
      ? areaIndex.filter((a) => a.norm.includes(q))
      : areaIndex.slice();
    // Areas that START with the typed text come first
    if (q)
      list.sort(
        (a, b) => Number(b.norm.startsWith(q)) - Number(a.norm.startsWith(q)),
      );
    suggestions = list.slice(0, MAX_SUGGESTIONS);

    // Nothing to suggest, or the user already typed the one exact match
    if (
      !suggestions.length ||
      (suggestions.length === 1 && suggestions[0].norm === q)
    ) {
      closeSuggestions();
      return;
    }

    const fragment = document.createDocumentFragment();
    suggestions.forEach((a, i) => {
      const li = document.createElement("li");
      li.id = `rc-area-option-${i}`;
      li.className = "rc-suggest-item";
      li.setAttribute("role", "option");
      li.dataset.index = String(i);
      const name = document.createElement("span");
      name.textContent = a.label;
      const count = document.createElement("span");
      count.className = "rc-suggest-count";
      count.textContent = `${a.count}件`;
      li.append(name, count);
      fragment.append(li);
    });
    el.areaList.replaceChildren(fragment);
    activeIndex = -1;
    openSuggestions();
  }

  function chooseArea(index) {
    const item = suggestions[index];
    if (!item) return;
    el.area.value = item.label;
    closeSuggestions();
    render();
  }

  /* ========================================================
     9. RESET / SCROLL
     ======================================================== */

  function resetFilters() {
    el.keyword.value = "";
    el.area.value = "";
    el.category.value = "all";
    el.price.value = "all";
    el.condition.value = "all";
    closeSuggestions();
    render();
  }

  // After pressing 検索 / Enter: bring results into view if they are far below (mobile).
  function scrollToResultsIfNeeded() {
    const top = el.results.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.results.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
  }

  /* ========================================================
     10. SHARED HEADER (reuse js/components.js, never duplicate it)
     ======================================================== */

  function setupHeader() {
    const host = $("site-header");
    if (!host) return;

    // Mark "もらう／買う" as the current page (works whenever the header appears).
    const markCurrent = () => {
      host.querySelectorAll("a[href]").forEach((a) => {
        if (
          /(^|\/)receive-item\.html([?#].*)?$/.test(
            a.getAttribute("href") || "",
          )
        ) {
          a.setAttribute("aria-current", "page");
        }
      });
    };
    new MutationObserver(markCurrent).observe(host, {
      childList: true,
      subtree: true,
    });
    markCurrent();

    // Safety net: only if the shared header never appeared, show a simple one.
    window.addEventListener("load", () => {
      setTimeout(() => {
        if (host.children.length) return;
        const header = document.createElement("header");
        header.className = "rc-fallback-header";
        const brand = document.createElement("a");
        brand.className = "rc-fallback-brand";
        brand.href = "index.html";
        brand.textContent = "♻ Mottainai Connect";
        const nav = document.createElement("nav");
        nav.className = "rc-fallback-nav";
        nav.setAttribute("aria-label", "メインメニュー");
        [
          ["ホーム", "index.html"],
          ["あげる／売る", "give-item.html"],
          ["もらう／買う", "receive-item.html"],
          ["マイページ", "auth/profile.html"],
        ].forEach(([text, href]) => {
          const a = document.createElement("a");
          a.href = href;
          a.textContent = text;
          nav.append(a);
        });
        header.append(brand, nav);
        host.append(header);
      }, 500);
    });
  }

  /* ========================================================
     11. START UP
     ======================================================== */

  function init() {
    loadStaticProducts();
    buildAreaIndex();
    restoreFromUrl();
    setupHeader();

    // Live search: runs on every keystroke (also while typing with a Japanese IME)
    el.keyword.addEventListener("input", render);
    el.area.addEventListener("input", () => {
      render();
      updateSuggestions();
    });
    [el.category, el.price, el.condition].forEach((s) =>
      s.addEventListener("change", render),
    );

    // 検索 button and Enter key (the input lives inside a <form>)
    el.form.addEventListener("submit", (event) => {
      event.preventDefault();
      closeSuggestions();
      render();
      scrollToResultsIfNeeded();
    });

    // Clear (✕) buttons
    el.keywordClear.addEventListener("click", () => {
      el.keyword.value = "";
      render();
      el.keyword.focus();
    });
    el.areaClear.addEventListener("click", () => {
      el.area.value = "";
      render();
      el.area.focus();
    });

    // Area suggestions: mouse, touch and keyboard
    el.area.addEventListener("focus", updateSuggestions);
    el.area.addEventListener("blur", closeSuggestions);
    el.area.addEventListener("keydown", (event) => {
      const open = !el.areaList.hidden;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) updateSuggestions();
        if (suggestions.length)
          setActive((activeIndex + 1) % suggestions.length);
      } else if (event.key === "ArrowUp" && open) {
        event.preventDefault();
        setActive((activeIndex - 1 + suggestions.length) % suggestions.length);
      } else if (event.key === "Enter" && open && activeIndex >= 0) {
        event.preventDefault();
        chooseArea(activeIndex);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        closeSuggestions();
      }
    });
    // mousedown (not click) so the input does not lose focus before we pick
    el.areaList.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const item = event.target.closest(".rc-suggest-item");
      if (item) chooseArea(Number(item.dataset.index));
    });

    // Reset buttons
    el.reset.addEventListener("click", resetFilters);
    el.emptyReset.addEventListener("click", () => {
      resetFilters();
      el.keyword.focus();
    });

    render();
    loadBackendProducts();
  }

  /* Small public hook for later: after you load Firestore listings,
     call  MottainaiReceive.addProducts(listOfProducts)  and the page updates.
     Each item needs the same fields as the static data (id, category, title, ...). */
  window.MottainaiReceive = {
    addProducts(list, sourceKey) {
      if (!Array.isArray(list)) return 0;
      const added = addToCatalog(list, sourceKey);
      buildAreaIndex();
      render();
      return added;
    },
  };

  init();
})();
