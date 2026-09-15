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

        body.ec-mobile-menu-active {
          overflow: hidden !important;
        }

        .ec-mobile-content-area {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }

        aside.ec-mobile-sidebar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          bottom: 0 !important;

          width: min(310px, 86vw) !important;
          min-width: 0 !important;
          max-width: 86vw !important;

          height: 100vh !important;
          max-height: 100vh !important;

          z-index: 10001 !important;

          overflow-y: auto !important;
          overflow-x: hidden !important;

          background: #ffffff !important;

          box-shadow:
            8px 0 30px
            rgba(15, 23, 42, 0.18) !important;

          transform:
            translateX(-110%) !important;

          transition:
            transform 0.28s ease,
            box-shadow 0.28s ease !important;
        }

        aside.ec-mobile-sidebar.ec-mobile-sidebar-open {
          transform:
            translateX(0) !important;
        }

        .ec-mobile-overlay {
          position: fixed !important;
          inset: 0 !important;

          background:
            rgba(15, 23, 42, 0.48) !important;

          z-index: 10000 !important;

          opacity: 0 !important;
          visibility: hidden !important;

          transition:
            opacity 0.25s ease,
            visibility 0.25s ease !important;
        }

        .ec-mobile-overlay.ec-mobile-overlay-open {
          opacity: 1 !important;
          visibility: visible !important;
        }

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
        }

        .ec-mobile-menu-button:active {
          transform: scale(0.95) !important;
        }

        .ec-mobile-menu-close {
          position: absolute !important;

          top: 14px !important;
          right: 14px !important;

          width: 40px !important;
          height: 40px !important;

          border: 0 !important;
          border-radius: 12px !important;

          background: #f3f4f6 !important;
          color: #374151 !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          font-size: 22px !important;

          cursor: pointer !important;

          z-index: 10003 !important;
        }
      }
    `;

    document.head.appendChild(style);
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

    if (
      sidebar.dataset.ecMobileMenuReady ===
      "true"
    ) {
      return;
    }

    sidebar.dataset.ecMobileMenuReady =
      "true";

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

    menuButton.onclick = function () {
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

    closeButton.onclick = function () {
      closeMenu(
        sidebar,
        overlay,
        menuButton
      );
    };

    overlay.onclick = function () {
      closeMenu(
        sidebar,
        overlay,
        menuButton
      );
    };

    sidebar
      .querySelectorAll("button, a")
      .forEach((item) => {
        if (item === closeButton) {
          return;
        }

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
        setupDashboard();
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
    }
  );

  window.addEventListener(
    "resize",
    run
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      run
    );
  } else {
    run();
  }
})();
