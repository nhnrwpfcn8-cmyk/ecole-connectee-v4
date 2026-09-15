```js
(function () {
  "use strict";

  const MOBILE_BREAKPOINT = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function findSidebar() {
    const sidebars = Array.from(
      document.querySelectorAll("aside")
    );

    if (!sidebars.length) {
      return null;
    }

    return (
      sidebars.find((aside) => {
        const text = (
          aside.textContent || ""
        ).toLowerCase();

        return (
          text.includes("accueil") ||
          text.includes("tableau") ||
          text.includes("enseignants") ||
          text.includes("élèves") ||
          text.includes("cours") ||
          text.includes("parents") ||
          text.includes("secrétaires") ||
          text.includes("présences") ||
          text.includes("notes") ||
          text.includes("communication") ||
          text.includes("paramètres") ||
          text.includes("déconnexion")
        );
      }) || sidebars[0]
    );
  }

  function injectStyles() {
    if (
      document.getElementById(
        "ec-mobile-menu-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "ec-mobile-menu-styles";

    style.textContent = `
      @media (max-width: 768px) {

        /* =====================================================
           BASE
        ===================================================== */

        body.ec-mobile-menu-active {
          overflow: hidden !important;
        }

        .ec-mobile-content-area {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        /* =====================================================
           SIDEBAR MOBILE
           Même principe visuel que le menu Élève
        ===================================================== */

        aside.ec-mobile-sidebar {
          position: fixed !important;

          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;

          width: 245px !important;
          min-width: 245px !important;
          max-width: 88vw !important;

          height: 100dvh !important;
          max-height: 100dvh !important;

          box-sizing: border-box !important;

          z-index: 10001 !important;

          overflow-x: hidden !important;
          overflow-y: auto !important;

          -webkit-overflow-scrolling: touch !important;

          background: #ffffff !important;

          border-right:
            1px solid #e5e7eb !important;

          padding:
            18px 12px 24px 12px !important;

          flex-shrink: 0 !important;

          transform:
            translateX(-110%) !important;

          transition:
            transform 0.28s ease !important;

          box-shadow:
            8px 0 30px
            rgba(15, 23, 42, 0.18) !important;

          scrollbar-width: thin !important;
        }

        aside.ec-mobile-sidebar.ec-mobile-sidebar-open {
          transform:
            translateX(0) !important;
        }

        /* =====================================================
           OVERLAY
        ===================================================== */

        .ec-mobile-overlay {
          position: fixed !important;

          inset: 0 !important;

          background:
            rgba(15, 23, 42, 0.48) !important;

          z-index: 10000 !important;

          opacity: 0 !important;
          visibility: hidden !important;

          pointer-events: none !important;

          transition:
            opacity 0.25s ease,
            visibility 0.25s ease !important;
        }

        .ec-mobile-overlay.ec-mobile-overlay-open {
          opacity: 1 !important;

          visibility: visible !important;

          pointer-events: auto !important;
        }

        /* =====================================================
           HAMBURGER
        ===================================================== */

        .ec-mobile-menu-button {
          position: fixed !important;

          top: 14px !important;
          left: 14px !important;

          width: 46px !important;
          height: 46px !important;

          border: 0 !important;

          border-radius: 12px !important;

          background: #4f46e5 !important;
          color: #ffffff !important;

          display: flex !important;

          align-items: center !important;
          justify-content: center !important;

          font-size: 23px !important;
          line-height: 1 !important;

          cursor: pointer !important;

          z-index: 10002 !important;

          box-shadow:
            0 8px 22px
            rgba(79, 70, 229, 0.30) !important;

          -webkit-tap-highlight-color:
            transparent !important;

          touch-action:
            manipulation !important;
        }

        .ec-mobile-menu-button:active {
          transform:
            scale(0.95) !important;
        }

        /* =====================================================
           BOUTON FERMER
        ===================================================== */

        .ec-mobile-menu-close {
          position: absolute !important;

          top: 12px !important;
          right: 12px !important;

          width: 40px !important;
          height: 40px !important;

          min-width: 40px !important;
          min-height: 40px !important;

          border: 0 !important;

          border-radius: 10px !important;

          background: #f3f4f6 !important;
          color: #374151 !important;

          display: flex !important;

          align-items: center !important;
          justify-content: center !important;

          font-size: 21px !important;
          line-height: 1 !important;

          cursor: pointer !important;

          z-index: 10003 !important;

          touch-action:
            manipulation !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        .ec-mobile-menu-close:active {
          transform:
            scale(0.94) !important;
        }

        /* =====================================================
           NAVIGATION
           Reproduction du style du menu Élève
        ===================================================== */

        aside.ec-mobile-sidebar nav {
          width: 100% !important;

          box-sizing: border-box !important;

          padding:
            0 !important;
        }

        aside.ec-mobile-sidebar nav > button,
        aside.ec-mobile-sidebar nav > a {

          box-sizing: border-box !important;

          width: 100% !important;

          min-height: 46px !important;

          display: flex !important;

          align-items: center !important;

          gap: 10px !important;

          text-align: left !important;

          border-radius: 12px !important;

          padding:
            11px 12px !important;

          margin-top: 3px !important;
          margin-bottom: 3px !important;

          font-size: 14px !important;

          font-weight: 600 !important;

          line-height: 1.35 !important;

          text-decoration: none !important;

          color: #374151 !important;

          background: #ffffff !important;

          border:
            1px solid #e5e7eb !important;

          white-space: normal !important;

          word-break: normal !important;

          overflow-wrap: break-word !important;

          touch-action:
            manipulation !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        /*
          Effet tactile identique au principe
          du menu Élève
        */

        aside.ec-mobile-sidebar nav > button:not(.ec-mobile-menu-close):active,
        aside.ec-mobile-sidebar nav > a:active {

          background:
            #eef2ff !important;

          border-color:
            #4f46e5 !important;
        }

        /*
          Les boutons qui ne sont pas directement
          dans NAV gardent également une bonne
          zone tactile.
        */

        aside.ec-mobile-sidebar
        button:not(.ec-mobile-menu-close),
        aside.ec-mobile-sidebar a {

          box-sizing: border-box !important;

          min-height: 46px !important;

          touch-action:
            manipulation !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        /* =====================================================
           LISTES
        ===================================================== */

        aside.ec-mobile-sidebar ul {

          box-sizing: border-box !important;

          width: 100% !important;

          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        aside.ec-mobile-sidebar li {

          box-sizing: border-box !important;

          margin-top: 3px !important;
          margin-bottom: 3px !important;
        }

        /* =====================================================
           ELEMENTS HORS NAV
        ===================================================== */

        aside.ec-mobile-sidebar
        > button:not(.ec-mobile-menu-close),
        aside.ec-mobile-sidebar
        > a {

          width: 100% !important;

          border-radius: 12px !important;

          padding:
            11px 12px !important;

          margin-top: 3px !important;
          margin-bottom: 3px !important;

          font-size: 14px !important;

          font-weight: 600 !important;

          text-align: left !important;

          border:
            1px solid #e5e7eb !important;

          background:
            #ffffff !important;

          color:
            #374151 !important;
        }

        /* =====================================================
           GROUPES / SOUS-MENUS
        ===================================================== */

        aside.ec-mobile-sidebar
        nav ul {

          padding-left: 0 !important;
          padding-right: 0 !important;

          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* =====================================================
           DECONNEXION
        ===================================================== */

        aside.ec-mobile-sidebar
        .ec-mobile-logout-item {

          margin-top: 10px !important;

          padding-top: 10px !important;

          border-top:
            1px solid #e5e7eb !important;
        }

        /*
          Le bouton de déconnexion garde le même
          style de bouton que les autres éléments.
        */

        aside.ec-mobile-sidebar
        .ec-mobile-logout-item button,
        aside.ec-mobile-sidebar
        .ec-mobile-logout-item a {

          width: 100% !important;

          min-height: 46px !important;

          margin-top: 0 !important;
          margin-bottom: 0 !important;

          border-radius: 12px !important;

          padding:
            11px 12px !important;

          text-align: left !important;
        }

        /* =====================================================
           PETITS ECRANS
        ===================================================== */

        @media (max-width: 420px) {

          aside.ec-mobile-sidebar {

            width: 245px !important;

            min-width: 245px !important;

            max-width: 88vw !important;
          }

          .ec-mobile-menu-button {

            top: 12px !important;
            left: 12px !important;

            width: 44px !important;
            height: 44px !important;
          }

          .ec-mobile-menu-close {

            top: 12px !important;
            right: 12px !important;
          }
        }

        /* =====================================================
           TRES PETITS ECRANS
        ===================================================== */

        @media (max-width: 360px) {

          aside.ec-mobile-sidebar {

            width: 86vw !important;

            min-width: 0 !important;

            max-width: 86vw !important;
          }

          aside.ec-mobile-sidebar
          nav > button,
          aside.ec-mobile-sidebar
          nav > a {

            min-height: 44px !important;

            margin-top: 3px !important;
            margin-bottom: 3px !important;
          }
        }
      }
    `;

    document.head.appendChild(style);
  }

  function markLogout(sidebar) {
    if (!sidebar) {
      return;
    }

    const clickableItems =
      Array.from(
        sidebar.querySelectorAll(
          "button, a"
        )
      );

    clickableItems.forEach(
      (item) => {

        if (
          item.classList.contains(
            "ec-mobile-menu-close"
          )
        ) {
          return;
        }

        const text = (
          item.textContent || ""
        )
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        if (
          text.includes("déconnexion") ||
          text.includes("deconnexion") ||
          text.includes("se déconnecter") ||
          text.includes("se deconnecter") ||
          text === "logout"
        ) {

          item.classList.add(
            "ec-mobile-logout-item"
          );

          const parent =
            item.parentElement;

          if (
            parent &&
            parent !== sidebar &&
            parent.tagName !== "NAV"
          ) {

            parent.classList.add(
              "ec-mobile-logout-item"
            );
          }
        }
      }
    );
  }

  function closeMenu(
    sidebar,
    overlay,
    menuButton
  ) {

    if (!sidebar || !overlay) {
      return;
    }

    sidebar.classList.remove(
      "ec-mobile-sidebar-open"
    );

    overlay.classList.remove(
      "ec-mobile-overlay-open"
    );

    document.body.classList.remove(
      "ec-mobile-menu-active"
    );

    if (menuButton) {

      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  }

  function openMenu(
    sidebar,
    overlay,
    menuButton
  ) {

    if (!sidebar || !overlay) {
      return;
    }

    sidebar.classList.add(
      "ec-mobile-sidebar-open"
    );

    overlay.classList.add(
      "ec-mobile-overlay-open"
    );

    document.body.classList.add(
      "ec-mobile-menu-active"
    );

    if (menuButton) {

      menuButton.setAttribute(
        "aria-expanded",
        "true"
      );
    }
  }

  function setupDashboard() {

    if (!isMobile()) {
      return;
    }

    const sidebar =
      findSidebar();

    if (!sidebar) {
      return;
    }

    sidebar.classList.add(
      "ec-mobile-sidebar"
    );

    const layout =
      sidebar.parentElement;

    if (layout) {

      layout.classList.add(
        "ec-mobile-dashboard-layout"
      );

      Array.from(
        layout.children
      ).forEach((child) => {

        if (child !== sidebar) {

          child.classList.add(
            "ec-mobile-content-area"
          );
        }
      });
    }

    let overlay =
      document.querySelector(
        ".ec-mobile-overlay"
      );

    if (!overlay) {

      overlay =
        document.createElement(
          "div"
        );

      overlay.className =
        "ec-mobile-overlay";

      document.body.appendChild(
        overlay
      );
    }

    let menuButton =
      document.querySelector(
        ".ec-mobile-menu-button"
      );

    if (!menuButton) {

      menuButton =
        document.createElement(
          "button"
        );

      menuButton.type =
        "button";

      menuButton.className =
        "ec-mobile-menu-button";

      menuButton.setAttribute(
        "aria-label",
        "Ouvrir le menu"
      );

      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );

      menuButton.innerHTML =
        "☰";

      document.body.appendChild(
        menuButton
      );
    }

    let closeButton =
      sidebar.querySelector(
        ".ec-mobile-menu-close"
      );

    if (!closeButton) {

      closeButton =
        document.createElement(
          "button"
        );

      closeButton.type =
        "button";

      closeButton.className =
        "ec-mobile-menu-close";

      closeButton.setAttribute(
        "aria-label",
        "Fermer le menu"
      );

      closeButton.innerHTML =
        "✕";

      sidebar.prepend(
        closeButton
      );
    }

    markLogout(sidebar);

    /*
      Évite de recréer les événements
      plusieurs fois.
    */

    if (
      sidebar.dataset.ecMobileMenuReady !==
      "true"
    ) {

      sidebar.dataset.ecMobileMenuReady =
        "true";

      menuButton.onclick =
        function () {

          const isOpen =
            sidebar.classList.contains(
              "ec-mobile-sidebar-open"
            );

          if (isOpen) {

            closeMenu(
              sidebar,
              overlay,
              menuButton
            );

          } else {

            openMenu(
              sidebar,
              overlay,
              menuButton
            );
          }
        };

      closeButton.onclick =
        function () {

          closeMenu(
            sidebar,
            overlay,
            menuButton
          );
        };

      overlay.onclick =
        function () {

          closeMenu(
            sidebar,
            overlay,
            menuButton
          );
        };
    }

    /*
      Les menus React peuvent être
      recréés dynamiquement.
    */

    sidebar
      .querySelectorAll(
        "button, a"
      )
      .forEach((item) => {

        if (
          item === closeButton
        ) {
          return;
        }

        if (
          item.dataset.ecMobileClickReady ===
          "true"
        ) {
          return;
        }

        item.dataset.ecMobileClickReady =
          "true";

        item.addEventListener(
          "click",
          function () {

            setTimeout(
              function () {

                closeMenu(
                  sidebar,
                  overlay,
                  menuButton
                );

              },
              120
            );
          }
        );
      });

    /*
      Le menu est fermé au chargement.
    */

    sidebar.classList.remove(
      "ec-mobile-sidebar-open"
    );

    overlay.classList.remove(
      "ec-mobile-overlay-open"
    );
  }

  function run() {

    injectStyles();

    setupDashboard();
  }

  const observer =
    new MutationObserver(
      function () {

        if (isMobile()) {

          setupDashboard();
        }
      }
    );

  function startObserver() {

    if (!document.body) {
      return;
    }

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );
  }

  window.addEventListener(
    "resize",
    function () {

      run();
    }
  );

  window.addEventListener(
    "orientationchange",
    function () {

      setTimeout(
        run,
        100
      );
    }
  );

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function () {

        run();

        startObserver();
      }
    );

  } else {

    run();

    startObserver();
  }
})();
```
