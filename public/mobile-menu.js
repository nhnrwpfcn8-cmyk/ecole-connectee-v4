(function () {
  "use strict";

  const MOBILE_BREAKPOINT = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
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
        const text = normalizeText(
          aside.textContent
        );

        return (
          text.includes("accueil") ||
          text.includes("tableau") ||
          text.includes("cours") ||
          text.includes("eleves") ||
          text.includes("notes") ||
          text.includes("communication") ||
          text.includes("presence") ||
          text.includes("bulletin") ||
          text.includes("deconnexion")
        );
      }) || sidebars[0]
    );
  }

  function injectStyles() {
    const oldStyles = [
      "ec-mobile-menu-styles",
      "ec-mobile-menu-styles-v2",
      "ec-mobile-menu-styles-v3",
    ];

    oldStyles.forEach((id) => {
      const old = document.getElementById(id);

      if (old) {
        old.remove();
      }
    });

    if (
      document.getElementById(
        "ec-mobile-menu-styles-v4"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "ec-mobile-menu-styles-v4";

    style.textContent = `
      /* =====================================================
         ECOLE CONNECTEE
         MOBILE MENU V4
         ===================================================== */

      @media (max-width: 768px) {

        html,
        body {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }

        body {
          padding-bottom: 78px !important;
        }

        /* -------------------------------------------------
           ANCIEN MENU MOBILE : SUPPRESSION
           ------------------------------------------------- */

        .ec-mobile-menu-button,
        .ec-mobile-overlay,
        .ec-mobile-menu-close {
          display: none !important;
        }

        /* -------------------------------------------------
           SIDEBAR DESKTOP : CACHEE SUR MOBILE
           ------------------------------------------------- */

        aside.ec-mobile-sidebar {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          position: static !important;
          width: 0 !important;
          min-width: 0 !important;
          max-width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        /* -------------------------------------------------
           CONTENU PRINCIPAL
           ------------------------------------------------- */

        main.ec-mobile-main,
        .ec-mobile-content-area {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          box-sizing: border-box !important;
        }

        main.ec-mobile-main {
          padding-bottom: 90px !important;
          overflow-x: hidden !important;
        }

        /* -------------------------------------------------
           COMMUNICATION : PLEIN ECRAN
           ------------------------------------------------- */

        main.ec-mobile-communication-page {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding-left: 12px !important;
          padding-right: 12px !important;
          box-sizing: border-box !important;
        }

        main.ec-mobile-communication-page
        > div,
        main.ec-mobile-communication-page
        section,
        main.ec-mobile-communication-page
        article {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        main.ec-mobile-communication-page
        textarea {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-height: 120px !important;
          box-sizing: border-box !important;
          resize: vertical !important;
          font-size: 16px !important;
          line-height: 1.45 !important;
        }

        main.ec-mobile-communication-page
        input,
        main.ec-mobile-communication-page
        select {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        /*
         * Les blocs en grille de Communication passent
         * automatiquement en une seule colonne.
         */
        main.ec-mobile-communication-page
        [style*="grid-template-columns"] {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        /* -------------------------------------------------
           BARRE MOBILE INFERIEURE
           ------------------------------------------------- */

        .ec-mobile-bottom-nav {
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 72px !important;
          min-height: 72px !important;
          box-sizing: border-box !important;

          display: grid !important;
          grid-template-columns:
            repeat(4, minmax(0, 1fr)) !important;

          align-items: stretch !important;

          background: #ffffff !important;
          border-top: 1px solid #e5e7eb !important;

          box-shadow:
            0 -6px 22px
            rgba(15, 23, 42, 0.10) !important;

          z-index: 99999 !important;

          padding:
            6px 5px
            calc(6px + env(safe-area-inset-bottom))
            5px !important;

          gap: 3px !important;
        }

        .ec-mobile-bottom-item {
          position: relative !important;

          width: 100% !important;
          min-width: 0 !important;
          height: 60px !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;

          gap: 2px !important;

          border: 0 !important;
          border-radius: 12px !important;

          background: transparent !important;
          color: #64748b !important;

          padding: 5px 2px !important;
          margin: 0 !important;

          font-family: inherit !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          line-height: 1.1 !important;

          cursor: pointer !important;

          -webkit-tap-highlight-color:
            transparent !important;

          touch-action: manipulation !important;

          box-sizing: border-box !important;
        }

        .ec-mobile-bottom-item:active {
          transform: scale(0.95) !important;
        }

        .ec-mobile-bottom-item.ec-active {
          color: #4f46e5 !important;
          background: #eef2ff !important;
        }

        .ec-mobile-bottom-icon {
          width: 28px !important;
          height: 28px !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          font-size: 21px !important;
          line-height: 1 !important;
        }

        .ec-mobile-bottom-label {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .ec-mobile-bottom-badge {
          position: absolute !important;
          top: 2px !important;
          right: calc(50% - 23px) !important;

          min-width: 17px !important;
          height: 17px !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          padding: 0 4px !important;

          border-radius: 999px !important;

          background: #ef4444 !important;
          color: #ffffff !important;

          font-size: 9px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
        }

        /* -------------------------------------------------
           BOUTON PLUS
           ------------------------------------------------- */

        .ec-mobile-more-button {
          position: relative !important;
        }

        .ec-mobile-more-icon {
          width: 32px !important;
          height: 32px !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          border-radius: 50% !important;

          background: #4f46e5 !important;
          color: #ffffff !important;

          font-size: 23px !important;
          font-weight: 400 !important;
          line-height: 1 !important;

          box-shadow:
            0 5px 14px
            rgba(79, 70, 229, 0.30) !important;
        }

        .ec-mobile-more-button.ec-active
        .ec-mobile-more-icon {
          background: #4338ca !important;
          color: #ffffff !important;
        }

        /* -------------------------------------------------
           PANNEAU PLUS
           ------------------------------------------------- */

        .ec-mobile-more-backdrop {
          position: fixed !important;
          inset: 0 !important;

          background:
            rgba(15, 23, 42, 0.40) !important;

          z-index: 99997 !important;

          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;

          transition:
            opacity 0.20s ease,
            visibility 0.20s ease !important;
        }

        .ec-mobile-more-backdrop.ec-open {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }

        .ec-mobile-more-panel {
          position: fixed !important;

          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;

          width: 100% !important;
          max-height: 78vh !important;

          box-sizing: border-box !important;

          background: #ffffff !important;

          border-radius:
            22px 22px 0 0 !important;

          box-shadow:
            0 -10px 35px
            rgba(15, 23, 42, 0.20) !important;

          z-index: 99998 !important;

          padding:
            14px 14px
            calc(86px + env(safe-area-inset-bottom))
            14px !important;

          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;

          transform: translateY(105%) !important;

          transition:
            transform 0.25s ease !important;
        }

        .ec-mobile-more-panel.ec-open {
          transform: translateY(0) !important;
        }

        .ec-mobile-more-header {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;

          width: 100% !important;

          margin-bottom: 12px !important;
        }

        .ec-mobile-more-title {
          margin: 0 !important;

          color: #111827 !important;

          font-size: 18px !important;
          font-weight: 700 !important;
        }

        .ec-mobile-more-close {
          width: 40px !important;
          height: 40px !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          border: 0 !important;
          border-radius: 10px !important;

          background: #f3f4f6 !important;
          color: #374151 !important;

          font-size: 21px !important;
          line-height: 1 !important;

          cursor: pointer !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        .ec-mobile-more-list {
          display: flex !important;
          flex-direction: column !important;

          width: 100% !important;

          gap: 7px !important;
        }

        .ec-mobile-more-item {
          width: 100% !important;
          min-height: 52px !important;

          display: flex !important;
          align-items: center !important;

          gap: 12px !important;

          padding: 10px 13px !important;
          margin: 0 !important;

          border:
            1px solid #e5e7eb !important;

          border-radius: 13px !important;

          background: #ffffff !important;
          color: #374151 !important;

          font-family: inherit !important;
          font-size: 14px !important;
          font-weight: 600 !important;

          text-align: left !important;

          cursor: pointer !important;

          box-sizing: border-box !important;

          -webkit-tap-highlight-color:
            transparent !important;

          touch-action: manipulation !important;
        }

        .ec-mobile-more-item:active {
          background: #eef2ff !important;
          border-color: #4f46e5 !important;
        }

        .ec-mobile-more-item-icon {
          width: 32px !important;
          height: 32px !important;

          flex: 0 0 32px !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          border-radius: 9px !important;

          background: #f3f4f6 !important;

          font-size: 18px !important;
        }

        .ec-mobile-more-logout {
          margin-top: 10px !important;

          border-color: #fecaca !important;
          background: #fff7f7 !important;
          color: #dc2626 !important;
        }

        .ec-mobile-more-logout
        .ec-mobile-more-item-icon {
          background: #fee2e2 !important;
        }
      }

      /* -----------------------------------------------------
         TRES PETITS ECRANS
         ----------------------------------------------------- */

      @media (max-width: 360px) {

        .ec-mobile-bottom-nav {
          height: 68px !important;
          min-height: 68px !important;
        }

        .ec-mobile-bottom-item {
          height: 56px !important;
          font-size: 9px !important;
        }

        .ec-mobile-bottom-icon {
          font-size: 19px !important;
        }

        .ec-mobile-more-icon {
          width: 30px !important;
          height: 30px !important;
          font-size: 21px !important;
        }
      }

      /* -----------------------------------------------------
         DESKTOP : RIEN NE CHANGE
         ----------------------------------------------------- */

      @media (min-width: 769px) {

        .ec-mobile-bottom-nav,
        .ec-mobile-more-panel,
        .ec-mobile-more-backdrop {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeLegacyElements() {
    const selectors = [
      ".ec-mobile-menu-button",
      ".ec-mobile-overlay",
      ".ec-mobile-menu-close",
    ];

    selectors.forEach((selector) => {
      document
        .querySelectorAll(selector)
        .forEach((element) => {
          element.remove();
        });
    });
  }

  function getSidebarItems(sidebar) {
    if (!sidebar) {
      return [];
    }

    return Array.from(
      sidebar.querySelectorAll("button, a")
    ).filter((item) => {
      if (
        item.classList.contains(
          "ec-mobile-menu-close"
        )
      ) {
        return false;
      }

      const text = normalizeText(
        item.textContent
      );

      return text.length > 0;
    });
  }

  function findItem(sidebar, name) {
    const wanted = normalizeText(name);

    return (
      getSidebarItems(sidebar).find(
        (item) =>
          normalizeText(item.textContent) ===
          wanted
      ) ||
      getSidebarItems(sidebar).find(
        (item) =>
          normalizeText(item.textContent).includes(
            wanted
          )
      ) ||
      null
    );
  }

  function findLogoutItem(sidebar) {
    if (!sidebar) {
      return null;
    }

    return (
      getSidebarItems(sidebar).find(
        (item) => {
          const text = normalizeText(
            item.textContent
          );

          return (
            text.includes("deconnexion") ||
            text.includes("se deconnecter") ||
            text === "logout"
          );
        }
      ) || null
    );
  }

  function findCommunicationItem(sidebar) {
    return findItem(
      sidebar,
      "communication"
    );
  }

  function getActiveSidebarItem(sidebar) {
    if (!sidebar) {
      return null;
    }

    const items =
      getSidebarItems(sidebar);

    const active = items.find((item) => {
      return (
        item.getAttribute("aria-current") ===
          "page" ||
        item.getAttribute("aria-current") ===
          "true" ||
        item.classList.contains("active") ||
        item.classList.contains("selected") ||
        item.className
          .toString()
          .toLowerCase()
          .includes("active")
      );
    });

    return active || null;
  }

  function clickSidebarItem(item) {
    if (!item) {
      return;
    }

    item.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  }

  function getIconForLabel(label) {
    const text = normalizeText(label);

    if (text.includes("accueil")) return "🏠";
    if (text.includes("cours")) return "📚";
    if (text.includes("exercice")) return "✏️";
    if (text.includes("evaluation")) return "📝";
    if (text.includes("note")) return "📊";
    if (text.includes("presence")) return "🕘";
    if (text.includes("bulletin")) return "📄";
    if (text.includes("communication")) return "💬";
    if (text.includes("carte")) return "🎫";
    if (text.includes("profil")) return "👤";
    if (text.includes("parametre")) return "⚙️";
    if (text.includes("emploi")) return "📅";
    if (text.includes("document")) return "📁";
    if (text.includes("deconnexion")) return "🚪";

    return "•";
  }

  function getCleanLabel(item) {
    return String(item.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLogoutItem(item) {
    if (!item) {
      return false;
    }

    const text = normalizeText(
      item.textContent
    );

    return (
      text.includes("deconnexion") ||
      text.includes("se deconnecter") ||
      text === "logout"
    );
  }

  function getCommunicationBadge(item) {
    if (!item) {
      return null;
    }

    const possible = Array.from(
      item.querySelectorAll("*")
    );

    const badge = possible.find(
      (element) => {
        const className =
          String(
            element.className || ""
          ).toLowerCase();

        return (
          className.includes("badge") ||
          className.includes("notification")
        );
      }
    );

    if (badge) {
      return (
        badge.textContent || ""
      ).trim();
    }

    const text =
      item.textContent || "";

    const match =
      text.match(/\b\d{1,3}\b/);

    return match
      ? match[0]
      : null;
  }

  function isCommunicationPage(sidebar) {
    const communicationItem =
      findCommunicationItem(sidebar);

    const active =
      getActiveSidebarItem(sidebar);

    if (
      active &&
      normalizeText(
        active.textContent
      ).includes("communication")
    ) {
      return true;
    }

    if (
      communicationItem &&
      (
        communicationItem.getAttribute(
          "aria-current"
        ) === "page" ||
        communicationItem.className
          .toString()
          .toLowerCase()
          .includes("active")
      )
    ) {
      return true;
    }

    const main =
      document.querySelector("main");

    if (!main) {
      return false;
    }

    const headings = Array.from(
      main.querySelectorAll(
        "h1, h2, h3, h4"
      )
    );

    const headingIsCommunication =
      headings.some((heading) =>
        normalizeText(
          heading.textContent
        ).includes("communication")
      );

    if (headingIsCommunication) {
      return true;
    }

    /*
     * La page Communication contient normalement
     * une zone de saisie textarea.
     */
    if (
      main.querySelector("textarea")
    ) {
      const mainText = normalizeText(
        main.textContent
      );

      if (
        mainText.includes("communication") ||
        mainText.includes("message")
      ) {
        return true;
      }
    }

    return false;
  }

  function markMain(sidebar) {
    const main =
      document.querySelector("main");

    if (!main) {
      return;
    }

    main.classList.add(
      "ec-mobile-main"
    );

    if (
      isCommunicationPage(sidebar)
    ) {
      main.classList.add(
        "ec-mobile-communication-page"
      );
    } else {
      main.classList.remove(
        "ec-mobile-communication-page"
      );
    }
  }

  function createBottomNavigation(sidebar) {
    let nav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    if (!nav) {
      nav =
        document.createElement("nav");

      nav.className =
        "ec-mobile-bottom-nav";

      nav.setAttribute(
        "aria-label",
        "Navigation mobile"
      );

      document.body.appendChild(nav);
    }

    nav.innerHTML = "";

    const primaryItems = [
      {
        name: "Accueil",
        icon: "🏠",
      },
      {
        name: "Cours",
        icon: "📚",
      },
      {
        name: "Notes",
        icon: "📊",
      },
      {
        name: "Communication",
        icon: "💬",
      },
    ];

    primaryItems.forEach(
      (definition) => {
        const sidebarItem =
          findItem(
            sidebar,
            definition.name
          );

        if (!sidebarItem) {
          return;
        }

        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "ec-mobile-bottom-item";

        button.dataset.menuName =
          definition.name;

        const icon =
          document.createElement("span");

        icon.className =
          "ec-mobile-bottom-icon";

        icon.textContent =
          definition.icon;

        const label =
          document.createElement("span");

        label.className =
          "ec-mobile-bottom-label";

        label.textContent =
          definition.name;

        button.appendChild(icon);
        button.appendChild(label);

        if (
          definition.name ===
          "Communication"
        ) {
          const badgeText =
            getCommunicationBadge(
              sidebarItem
            );

          if (badgeText) {
            const badge =
              document.createElement(
                "span"
              );

            badge.className =
              "ec-mobile-bottom-badge";

            badge.textContent =
              badgeText;

            button.appendChild(
              badge
            );
          }
        }

        button.addEventListener(
          "click",
          function () {
            closeMorePanel();
            clickSidebarItem(
              sidebarItem
            );

            setTimeout(
              function () {
                updateActiveState(
                  sidebar
                );
                markMain(sidebar);
              },
              80
            );
          }
        );

        nav.appendChild(button);
      }
    );

    /*
     * Le bouton PLUS est toujours le dernier.
     */
    const moreButton =
      document.createElement("button");

    moreButton.type = "button";

    moreButton.className =
      "ec-mobile-bottom-item ec-mobile-more-button";

    moreButton.setAttribute(
      "aria-label",
      "Plus"
    );

    const moreIcon =
      document.createElement("span");

    moreIcon.className =
      "ec-mobile-more-icon";

    moreIcon.textContent = "+";

    const moreLabel =
      document.createElement("span");

    moreLabel.className =
      "ec-mobile-bottom-label";

    moreLabel.textContent = "Plus";

    moreButton.appendChild(
      moreIcon
    );

    moreButton.appendChild(
      moreLabel
    );

    moreButton.addEventListener(
      "click",
      function () {
        toggleMorePanel(sidebar);
      }
    );

    nav.appendChild(
      moreButton
    );

    return nav;
  }

  function createMorePanel(sidebar) {
    let backdrop =
      document.querySelector(
        ".ec-mobile-more-backdrop"
      );

    let panel =
      document.querySelector(
        ".ec-mobile-more-panel"
      );

    if (!backdrop) {
      backdrop =
        document.createElement("div");

      backdrop.className =
        "ec-mobile-more-backdrop";

      document.body.appendChild(
        backdrop
      );

      backdrop.addEventListener(
        "click",
        function () {
          closeMorePanel();
        }
      );
    }

    if (!panel) {
      panel =
        document.createElement("div");

      panel.className =
        "ec-mobile-more-panel";

      panel.setAttribute(
        "role",
        "dialog"
      );

      panel.setAttribute(
        "aria-label",
        "Plus"
      );

      document.body.appendChild(
        panel
      );
    }

    panel.innerHTML = "";

    const header =
      document.createElement("div");

    header.className =
      "ec-mobile-more-header";

    const title =
      document.createElement("h2");

    title.className =
      "ec-mobile-more-title";

    title.textContent =
      "Plus";

    const close =
      document.createElement("button");

    close.type = "button";

    close.className =
      "ec-mobile-more-close";

    close.setAttribute(
      "aria-label",
      "Fermer"
    );

    close.textContent = "✕";

    close.addEventListener(
      "click",
      function () {
        closeMorePanel();
      }
    );

    header.appendChild(title);
    header.appendChild(close);

    panel.appendChild(header);

    const list =
      document.createElement("div");

    list.className =
      "ec-mobile-more-list";

    const primaryNames = [
      "accueil",
      "cours",
      "notes",
      "communication",
    ];

    const sidebarItems =
      getSidebarItems(sidebar);

    sidebarItems.forEach(
      (sidebarItem) => {
        const label =
          getCleanLabel(
            sidebarItem
          );

        const normalized =
          normalizeText(label);

        if (!label) {
          return;
        }

        if (
          primaryNames.some(
            (name) =>
              normalized === name
          )
        ) {
          return;
        }

        const button =
          document.createElement("button");

        button.type = "button";

        button.className =
          "ec-mobile-more-item";

        if (
          isLogoutItem(
            sidebarItem
          )
        ) {
          button.classList.add(
            "ec-mobile-more-logout"
          );
        }

        const icon =
          document.createElement("span");

        icon.className =
          "ec-mobile-more-item-icon";

        icon.textContent =
          isLogoutItem(
            sidebarItem
          )
            ? "🚪"
            : getIconForLabel(
                label
              );

        const text =
          document.createElement("span");

        text.textContent =
          label;

        button.appendChild(icon);
        button.appendChild(text);

        button.addEventListener(
          "click",
          function () {
            closeMorePanel();

            clickSidebarItem(
              sidebarItem
            );

            setTimeout(
              function () {
                updateActiveState(
                  sidebar
                );

                markMain(
                  sidebar
                );
              },
              80
            );
          }
        );

        list.appendChild(
          button
        );
      }
    );

    /*
     * Sécurité :
     * si la déconnexion n'a pas été trouvée
     * dans la boucle ci-dessus, on la cherche
     * explicitement.
     */
    const logout =
      findLogoutItem(sidebar);

    if (
      logout &&
      !Array.from(
        list.children
      ).some((button) =>
        button.classList.contains(
          "ec-mobile-more-logout"
        )
      )
    ) {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "ec-mobile-more-item ec-mobile-more-logout";

      const icon =
        document.createElement("span");

      icon.className =
        "ec-mobile-more-item-icon";

      icon.textContent = "🚪";

      const text =
        document.createElement("span");

      text.textContent =
        getCleanLabel(logout) ||
        "Déconnexion";

      button.appendChild(icon);
      button.appendChild(text);

      button.addEventListener(
        "click",
        function () {
          closeMorePanel();

          clickSidebarItem(
            logout
          );
        }
      );

      list.appendChild(
        button
      );
    }

    panel.appendChild(list);

    return panel;
  }

  function openMorePanel() {
    const backdrop =
      document.querySelector(
        ".ec-mobile-more-backdrop"
      );

    const panel =
      document.querySelector(
        ".ec-mobile-more-panel"
      );

    if (!backdrop || !panel) {
      return;
    }

    backdrop.classList.add(
      "ec-open"
    );

    panel.classList.add(
      "ec-open"
    );

    document.body.dataset.ecMoreOpen =
      "true";
  }

  function closeMorePanel() {
    const backdrop =
      document.querySelector(
        ".ec-mobile-more-backdrop"
      );

    const panel =
      document.querySelector(
        ".ec-mobile-more-panel"
      );

    if (backdrop) {
      backdrop.classList.remove(
        "ec-open"
      );
    }

    if (panel) {
      panel.classList.remove(
        "ec-open"
      );
    }

    delete document.body.dataset
      .ecMoreOpen;
  }

  function toggleMorePanel(sidebar) {
    const panel =
      document.querySelector(
        ".ec-mobile-more-panel"
      );

    if (
      panel &&
      panel.classList.contains(
        "ec-open"
      )
    ) {
      closeMorePanel();
      return;
    }

    createMorePanel(sidebar);
    openMorePanel();
  }

  function updateActiveState(sidebar) {
    const nav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    if (!nav) {
      return;
    }

    const active =
      getActiveSidebarItem(
        sidebar
      );

    const activeText =
      active
        ? normalizeText(
            active.textContent
          )
        : "";

    nav
      .querySelectorAll(
        ".ec-mobile-bottom-item"
      )
      .forEach((button) => {
        const menuName =
          normalizeText(
            button.dataset.menuName
          );

        button.classList.toggle(
          "ec-active",
          !!activeText &&
            activeText.includes(
              menuName
            )
        );
      });
  }

  function removeMobileNavigation() {
    const selectors = [
      ".ec-mobile-bottom-nav",
      ".ec-mobile-more-panel",
      ".ec-mobile-more-backdrop",
    ];

    selectors.forEach((selector) => {
      document
        .querySelectorAll(selector)
        .forEach((element) => {
          element.remove();
        });
    });

    document
      .querySelectorAll(
        "aside.ec-mobile-sidebar"
      )
      .forEach((aside) => {
        aside.classList.remove(
          "ec-mobile-sidebar"
        );
      });

    const main =
      document.querySelector("main");

    if (main) {
      main.classList.remove(
        "ec-mobile-main"
      );

      main.classList.remove(
        "ec-mobile-communication-page"
      );
    }
  }

  function setupDashboard() {
    injectStyles();

    if (!isMobile()) {
      removeMobileNavigation();
      return;
    }

    removeLegacyElements();

    const sidebar =
      findSidebar();

    if (!sidebar) {
      return;
    }

    sidebar.classList.add(
      "ec-mobile-sidebar"
    );

    /*
     * Le layout React reste intact.
     * On ne modifie pas les calculs ni
     * les composants existants.
     */
    const layout =
      sidebar.parentElement;

    if (layout) {
      Array.from(
        layout.children
      ).forEach((child) => {
        if (
          child !== sidebar
        ) {
          child.classList.add(
            "ec-mobile-content-area"
          );
        }
      });
    }

    markMain(sidebar);

    const existingNav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    if (
      !existingNav ||
      existingNav.dataset
        .ecSidebarText !==
        sidebar.textContent
    ) {
      if (existingNav) {
        existingNav.remove();
      }

      createBottomNavigation(
        sidebar
      );
    }

    /*
     * Toujours reconstruire le panneau Plus
     * afin de récupérer les éventuels changements
     * de menu de React.
     */
    createMorePanel(sidebar);

    const nav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    if (nav) {
      nav.dataset.ecSidebarText =
        sidebar.textContent;
    }

    updateActiveState(sidebar);
    markMain(sidebar);
  }

  let setupTimer = null;

  function scheduleSetup() {
    if (setupTimer) {
      clearTimeout(
        setupTimer
      );
    }

    setupTimer = setTimeout(
      function () {
        setupTimer = null;

        if (isMobile()) {
          setupDashboard();
        }
      },
      80
    );
  }

  const observer =
    new MutationObserver(
      function () {
        scheduleSetup();
      }
    );

  function start() {
    injectStyles();

    setupDashboard();

    if (document.body) {
      observer.observe(
        document.body,
        {
          childList: true,
          subtree: true,
        }
      );
    }
  }

  window.addEventListener(
    "resize",
    function () {
      scheduleSetup();
    }
  );

  window.addEventListener(
    "orientationchange",
    function () {
      setTimeout(
        scheduleSetup,
        150
      );
    }
  );

  window.addEventListener(
    "pageshow",
    function () {
      scheduleSetup();
    }
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true,
      }
    );
  } else {
    start();
  }
})();
