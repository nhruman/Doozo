/* ============================================================
   Mottainai Connect - Shared Components
   ------------------------------------------------------------
   すべてのページで同じヘッダーを使うための共通ファイルです。
   ナビゲーションを変更したいときは、このファイルだけ編集します。
   ============================================================ */
(function () {
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <header class="main-header">

        <div class="header-container">

            <!-- Logo -->
            <a href="index.html" class="logo" aria-label="Mottainai Connect home">
                <img src="images/dozo.png" alt="Mottainai Connect">
            </a>


            <!-- Center navigation -->
            <nav class="navbar" aria-label="Main navigation">

                <div class="nav-center">
                    <a href="give-item.html"data-i18n="nav.give">あげる／売る</a>
                    <a href="receive-item.html"data-i18n="nav.receive">もらう／買う</a>
                </div>


                <!-- Right navigation -->
                <div class="nav-right">

                    <!-- Login -->
                    <!-- Login -->
                      <a href="auth/login.html"class="nav-login"id="header-account-link"data-i18n="nav.login">
                      <i class="fa-solid fa-user"></i> ログイン</a>


                    <!-- Language -->
                    <div class="lang-buttons"aria-label="Language selection">

                        <button class="btn-lang"id="btn-ja"data-lang="ja"type="button">日本語</button>

                        <div class="dropdown">
                            <button class="btn-lang"id="btn-en"data-lang="en"type="button">English
                                <i class="fa-solid fa-caret-down"></i>
                            </button>

                            <div
                                class="dropdown-content"id="language-menu">

                                <button type="button" data-lang="zh">中文</button>
                                <button type="button" data-lang="ne">नेपाली</button>
                                <button type="button" data-lang="bn">বাংলা</button>
                                <button type="button" data-lang="vi">Tiếng Việt</button>
                                <button type="button" data-lang="ta">தமிழ்</button>
                                <button type="button" data-lang="my">မြန်မာဘာသာ</button>
                                <button type="button" data-lang="id">Bahasa Indonesia</button>
                                <button type="button" data-lang="fil">Filipino</button>
                                <button type="button" data-lang="pt">Português</button>
                                <button type="button" data-lang="ko">한국어</button>

                            </div>
                        </div>
                    </div>

                    <!-- Filter -->
                    <div id="filter-container"></div>

                    <!-- Mobile menu -->
                    <button class="menu-toggle"id="menu-toggle"type="button"aria-label="Open menu"aria-expanded="false">
                        <i class="fa-solid fa-bars"></i>
                    </button>

                </div>

            </nav>

        </div>


        <!-- Mobile navigation -->
        <div class="mobile-nav" id="mobile-nav">

            <a href="give-item.html" data-i18n="nav.give">あげる／売る</a>
            <a href="receive-item.html"data-i18n="nav.receive">もらう／買う</a>
            <a href="auth/login.html"id="mobile-account-link"data-i18n="nav.login">ログイン</a>
        </div>
    </header>`;
// ==========================================================
// Active Page: Automatically highlight the current page
// ==========================================================

const page = location.pathname.split("/").pop() || "index.html";

header.querySelectorAll("a[href]").forEach((link) => {

  const href = link.getAttribute("href") || "";

  // Check current page
  if (href === page) {

    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");

  } else {

    link.classList.remove("is-active");
    link.removeAttribute("aria-current");

  }

});

  // Mobile menu open/close.
  const toggle = document.getElementById("menu-toggle");
  const mobile = document.getElementById("mobile-nav");
  toggle?.addEventListener("click", () => {
    const open = mobile.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = open
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });
  mobile?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      mobile.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      if (toggle) toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }),
  );

  // Language buttons are handled centrally here.
  header.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () =>
      window.changeLanguage?.(button.dataset.lang),
    );
  });

  // Apply the saved language after the shared header has been inserted.
  window.applyLanguage?.();
})();
