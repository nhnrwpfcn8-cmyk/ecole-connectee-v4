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
           SIDEBAR / DRAWER
        ===================================================== */

        aside.ec-mobile-sidebar {
          position: fixed !important;

          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;

          width: min(320px, 88vw) !important;
          min-width: 0 !important;
          max-width: 88vw !important;

          height: 100dvh !important;
          max-height: 100dvh !important;

          box-sizing: border-box !important;

          z-index: 10001 !important;

          overflow-x: hidden !important;
          overflow-y: auto !important;

          -webkit-overflow-scrolling: touch !important;

          background: #ffffff !important;

          box-shadow:
            10px 0 35px
            rgba(15, 23, 42, 0.22) !important;

          transform:
            translateX(-110%) !important;

          transition:
            transform 0.28s ease,
            box-shadow 0.28s ease !important;

          padding-top: 68px !important;
          padding-bottom: 24px !important;

          scrollbar-width: thin !important;
        }

        aside.ec-mobile-sidebar.ec-mobile-sidebar-open {
          transform:
            translateX(0) !important;

          box-shadow:
            10px 0 40px
            rgba(15, 23, 42, 0.28) !important;
        }

        /* =====================================================
           OVERLAY
        ===================================================== */

        .ec-mobile-overlay {
          position: fixed !important;

          inset: 0 !important;

          background:
            rgba(15, 23, 42, 0.52) !important;

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
          border-radius: 14px !important;

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

          touch-action: manipulation !important;
        }

        .ec-mobile-menu-button:active {
          transform: scale(0.95) !important;
        }

        /* =====================================================
           BOUTON FERMER
        ===================================================== */

        .ec-mobile-menu-close {
          position: absolute !important;

          top: 14px !important;
          right: 14px !important;

          width: 42px !important;
          height: 42px !important;

          min-width: 42px !important;
          min-height: 42px !important;

          border: 0 !important;
          border-radius: 12px !important;

          background: #f3f4f6 !important;
          color: #374151 !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          font-size: 21px !important;
          line-height: 1 !important;

          cursor: pointer !important;

          z-index: 10003 !important;

          touch-action: manipulation !important;
          -webkit-tap-highlight-color:
            transparent !important;
        }

        .ec-mobile-menu-close:active {
          transform: scale(0.94) !important;
        }

        /* =====================================================
           ZONE DES MENUS
        ===================================================== */

        aside.ec-mobile-sidebar
        button:not(.ec-mobile-menu-close),
        aside.ec-mobile-sidebar a {
          box-sizing: border-box !important;
        }

        /*
          On augmente uniquement la zone tactile.
          Les couleurs et le design des dashboards existants
          restent prioritaires autant que possible.
        */

        aside.ec-mobile-sidebar
        button:not(.ec-mobile-menu-close),
        aside.ec-mobile-sidebar
        a {
          min-height: 46px !important;

          padding-top: 10px !important;
          padding-bottom: 10px !important;

          margin-top: 3px !important;
          margin-bottom: 3px !important;

          line-height: 1.35 !important;

          white-space: normal !important;

          word-break: normal !important;

          touch-action: manipulation !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        /*
          Évite que les éléments du menu se collent
          visuellement les uns aux autres.
        */

        aside.ec-mobile-sidebar
        nav > button,
        aside.ec-mobile-sidebar
        nav > a,
        aside.ec-mobile-sidebar
        ul > li,
        aside.ec-mobile-sidebar
        > button:not(.ec-mobile-menu-close),
        aside.ec-mobile-sidebar
        > a {
          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }

        /* =====================================================
           GROUPES DE MENU
        ===================================================== */

        aside.ec-mobile-sidebar nav {
          width: 100% !important;
          box-sizing: border-box !important;

          padding-left: 10px !important;
          padding-right: 10px !important;
        }

        aside.ec-mobile-sidebar ul {
          box-sizing: border-box !important;

          padding-left: 8px !important;
          padding-right: 8px !important;
        }

        aside.ec-mobile-sidebar li {
          box-sizing: border-box !important;

          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }

        /* =====================================================
           TEXTE DES MENUS
        ===================================================== */

        aside.ec-mobile-sidebar
        button:not(.ec-mobile-menu-close),
        aside.ec-mobile-sidebar
        a {
          overflow-wrap: break-word !important;
        }

        /* =====================================================
           DECONNEXION
        ===================================================== */

        aside.ec-mobile-sidebar
        .ec-mobile-logout-item {
          position: sticky !important;

          bottom: 0 !important;

          z-index: 5 !important;

          margin-top: 12px !important;
          margin-bottom: 4px !important;

          padding-top: 10px !important;
          padding-bottom: 10px !important;

          background: #ffffff !important;

          border-top:
            1px solid
            rgba(148, 163, 184, 0.18) !important;
        }

        /*
          Si le bouton/lien de déconnexion n'a pas
          de conteneur spécifique, cette classe sera
          ajoutée directement sur son élément parent.
        */

        aside.ec-mobile-sidebar
        .ec-mobile-logout-item
        button,
        aside.ec-mobile-sidebar
        .ec-mobile-logout-item
        a {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
        }

        /* =====================================================
           PETITS ECRANS
        ===================================================== */

        @media (max-width: 420px) {

          aside.ec-mobile-sidebar {
            width: min(300px, 88vw) !important;
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
            max-width: 86vw !important;
          }

          aside.ec-mobile-sidebar
          button:not(.ec-mobile-menu-close),
          aside.ec-mobile-sidebar
          a {
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

          /*
            On applique également la classe au parent
            lorsque celui-ci est un élément de menu.
          */
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

    const sidebar = findSidebar();

    if (!sidebar) {
      return;
    }

    /*
      Même si le dashboard a déjà été initialisé,
      on continue à identifier les éléments de menu
      nouvellement créés par React.
    */

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
        document.createElement("div");

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
        document.createElement("button");

      menuButton.type = "button";

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

      menuButton.innerHTML = "☰";

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
        document.createElement("button");

      closeButton.type = "button";

      closeButton.className =
        "ec-mobile-menu-close";

      closeButton.setAttribute(
        "aria-label",
        "Fermer le menu"
      );

      closeButton.innerHTML = "✕";

      sidebar.prepend(
        closeButton
      );
    }

    markLogout(sidebar);

    /*
      Évite de recréer les événements plusieurs fois.
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
      Les menus React peuvent être recréés.
      On marque donc chaque élément déjà traité.
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
