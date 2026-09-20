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
          text.includes("cours") ||
          text.includes("élèves") ||
          text.includes("eleves") ||
          text.includes("notes") ||
          text.includes("communication") ||
          text.includes("présences") ||
          text.includes("presences") ||
          text.includes("bulletins") ||
          text.includes("déconnexion") ||
          text.includes("deconnexion")
        );
      }) || sidebars[0]
    );
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getItemText(item) {
    return normalizeText(
      item?.textContent || ""
    );
  }

  function isLogoutItem(item) {
    const text = getItemText(item);

    return (
      text.includes("deconnexion") ||
      text.includes("se deconnecter") ||
      text === "logout"
    );
  }

  function getSidebarItems(sidebar) {
    if (!sidebar) {
      return [];
    }

    return Array.from(
      sidebar.querySelectorAll(
        "button, a"
      )
    ).filter((item) => {
      if (
        item.classList.contains(
          "ec-mobile-menu-close"
        )
      ) {
        return false;
      }

      if (isLogoutItem(item)) {
        return false;
      }

      const text =
        getItemText(item);

      return Boolean(text);
    });
  }

  function findItemByLabel(
    sidebar,
    label
  ) {
    const wanted =
      normalizeText(label);

    return getSidebarItems(sidebar).find(
      (item) =>
        getItemText(item) === wanted
    );
  }

  function getItemIcon(item) {
    if (!item) {
      return "";
    }

    const iconElement =
      item.querySelector(
        "span:first-child, img"
      );

    if (
      iconElement &&
      iconElement.tagName === "IMG"
    ) {
      return "";
    }

    if (iconElement) {
      const text =
        iconElement.textContent?.trim();

      if (text && text.length <= 4) {
        return text;
      }
    }

    const text =
      item.textContent?.trim() || "";

    const emojiMatch =
      text.match(
        /^[^\p{L}\p{N}\s]{1,4}/u
      );

    return emojiMatch
      ? emojiMatch[0]
      : "";
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
      /* =====================================================
         DESKTOP
         Aucun changement au menu desktop.
      ===================================================== */

      .ec-mobile-bottom-nav,
      .ec-mobile-more-panel,
      .ec-mobile-more-backdrop {
        display: none;
      }

      /* =====================================================
         MOBILE
      ===================================================== */

      @media (max-width: 768px) {

        html,
        body {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        /*
          Le dashboard ne doit plus être comprimé
          par la sidebar desktop.
        */

        aside.ec-mobile-sidebar {
          display: none !important;
          width: 0 !important;
          min-width: 0 !important;
          max-width: 0 !important;
          flex: 0 0 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /*
          Zone principale :
          pleine largeur du téléphone.
        */

        .ec-mobile-content-area {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          flex: 1 1 auto !important;
        }

        /*
          Le layout général ne doit plus réserver
          de largeur à la sidebar.
        */

        .ec-mobile-dashboard-layout {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        /*
          Empêche le contenu de dépasser
          horizontalement sur iPhone.
        */

        main {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        /*
          Le contenu doit laisser de la place
          pour la navigation inférieure.
        */

        main.ec-mobile-main {
          padding-bottom:
            96px !important;
        }

        /*
          =====================================================
          NAVIGATION MOBILE DU BAS
          =====================================================
        */

        .ec-mobile-bottom-nav {
          position: fixed !important;

          left: 10px !important;
          right: 10px !important;
          bottom: 10px !important;

          height: 68px !important;

          box-sizing: border-box !important;

          display: flex !important;

          align-items: stretch !important;
          justify-content: space-around !important;

          background:
            rgba(255, 255, 255, 0.97) !important;

          border:
            1px solid #e5e7eb !important;

          border-radius: 22px !important;

          box-shadow:
            0 10px 35px
            rgba(15, 23, 42, 0.16) !important;

          backdrop-filter:
            blur(18px) !important;

          -webkit-backdrop-filter:
            blur(18px) !important;

          z-index: 9998 !important;

          padding:
            6px !important;

          padding-bottom:
            max(6px, env(safe-area-inset-bottom)) !important;

          gap: 2px !important;
        }

        .ec-mobile-bottom-item {
          position: relative !important;

          flex: 1 1 0 !important;

          min-width: 0 !important;

          height: 56px !important;

          border: 0 !important;

          background:
            transparent !important;

          color: #4b5563 !important;

          border-radius: 17px !important;

          display: flex !important;

          flex-direction: column !important;

          align-items: center !important;

          justify-content: center !important;

          gap: 2px !important;

          padding:
            5px 3px !important;

          margin: 0 !important;

          font-family:
            inherit !important;

          font-size: 10px !important;

          font-weight: 700 !important;

          line-height: 1.15 !important;

          text-align: center !important;

          cursor: pointer !important;

          touch-action:
            manipulation !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        .ec-mobile-bottom-item
        .ec-mobile-bottom-icon {
          display: flex !important;

          align-items: center !important;
          justify-content: center !important;

          width: 30px !important;
          height: 28px !important;

          font-size: 22px !important;

          line-height: 1 !important;
        }

        .ec-mobile-bottom-item
        .ec-mobile-bottom-label {
          display: block !important;

          max-width: 100% !important;

          overflow: hidden !important;

          white-space: nowrap !important;

          text-overflow: ellipsis !important;
        }

        .ec-mobile-bottom-item
        .ec-mobile-bottom-active {
          background:
            #eef2ff !important;

          color:
            #4f46e5 !important;
        }

        .ec-mobile-bottom-item:active {
          transform:
            scale(0.95) !important;
        }

        /*
          Badge Communication
        */

        .ec-mobile-bottom-badge {
          position: absolute !important;

          top: 3px !important;
          right: 20% !important;

          min-width: 17px !important;
          height: 17px !important;

          padding:
            0 4px !important;

          box-sizing: border-box !important;

          display: flex !important;

          align-items: center !important;
          justify-content: center !important;

          border-radius: 999px !important;

          background:
            #ef4444 !important;

          color:
            #ffffff !important;

          border:
            2px solid #ffffff !important;

          font-size: 9px !important;

          font-weight: 800 !important;

          line-height: 1 !important;
        }

        /*
          =====================================================
          BOUTON PLUS
          =====================================================
        */

        .ec-mobile-more-backdrop {
          position: fixed !important;

          inset: 0 !important;

          background:
            rgba(15, 23, 42, 0.38) !important;

          z-index: 9996 !important;

          opacity: 0 !important;

          visibility: hidden !important;

          pointer-events: none !important;

          transition:
            opacity 0.2s ease,
            visibility 0.2s ease !important;
        }

        .ec-mobile-more-backdrop.ec-open {
          opacity: 1 !important;

          visibility: visible !important;

          pointer-events: auto !important;
        }

        .ec-mobile-more-panel {
          position: fixed !important;

          left: 10px !important;
          right: 10px !important;
          bottom: 88px !important;

          max-height:
            calc(100dvh - 130px) !important;

          overflow-y: auto !important;

          box-sizing: border-box !important;

          background:
            #ffffff !important;

          border:
            1px solid #e5e7eb !important;

          border-radius: 22px !important;

          box-shadow:
            0 18px 45px
            rgba(15, 23, 42, 0.22) !important;

          z-index: 9997 !important;

          padding:
            14px !important;

          opacity: 0 !important;

          visibility: hidden !important;

          pointer-events: none !important;

          transform:
            translateY(12px) !important;

          transition:
            opacity 0.2s ease,
            visibility 0.2s ease,
            transform 0.2s ease !important;
        }

        .ec-mobile-more-panel.ec-open {
          opacity: 1 !important;

          visibility: visible !important;

          pointer-events: auto !important;

          transform:
            translateY(0) !important;
        }

        .ec-mobile-more-title {
          display: flex !important;

          align-items: center !important;
          justify-content: space-between !important;

          padding:
            4px 4px 12px 4px !important;

          color:
            #111827 !important;

          font-size: 18px !important;

          font-weight: 800 !important;
        }

        .ec-mobile-more-close {
          width: 34px !important;
          height: 34px !important;

          border: 0 !important;

          border-radius: 10px !important;

          background:
            #f3f4f6 !important;

          color:
            #374151 !important;

          display: flex !important;

          align-items: center !important;
          justify-content: center !important;

          font-size: 18px !important;

          cursor: pointer !important;
        }

        .ec-mobile-more-list {
          display: grid !important;

          grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;

          gap: 9px !important;
        }

        .ec-mobile-more-item {
          min-height: 66px !important;

          box-sizing: border-box !important;

          border:
            1px solid #e5e7eb !important;

          border-radius: 15px !important;

          background:
            #ffffff !important;

          color:
            #374151 !important;

          display: flex !important;

          align-items: center !important;

          gap: 9px !important;

          padding:
            10px !important;

          font-family:
            inherit !important;

          font-size: 13px !important;

          font-weight: 700 !important;

          text-align: left !important;

          cursor: pointer !important;

          touch-action:
            manipulation !important;

          -webkit-tap-highlight-color:
            transparent !important;
        }

        .ec-mobile-more-item:active {
          background:
            #eef2ff !important;

          border-color:
            #4f46e5 !important;

          transform:
            scale(0.98) !important;
        }

        .ec-mobile-more-icon {
          width: 34px !important;
          height: 34px !important;

          min-width: 34px !important;

          border-radius: 10px !important;

          background:
            #eef2ff !important;

          display: flex !important;

          align-items: center !important;
          justify-content: center !important;

          font-size: 20px !important;
        }

        .ec-mobile-more-label {
          min-width: 0 !important;

          overflow: hidden !important;

          text-overflow: ellipsis !important;
        }

        /*
          Déconnexion dans le panneau Plus
        */

        .ec-mobile-more-logout {
          grid-column:
            1 / -1 !important;

          min-height: 52px !important;

          border:
            1px solid #fecaca !important;

          background:
            #fff7f7 !important;

          color:
            #dc2626 !important;

          justify-content: center !important;

          text-align: center !important;
        }

        /*
          =====================================================
          PETITS TELEPHONES
          =====================================================
        */

        @media (max-width: 420px) {

          .ec-mobile-bottom-nav {
            left: 7px !important;
            right: 7px !important;
            bottom: 7px !important;

            border-radius: 20px !important;
          }

          .ec-mobile-bottom-item {
            font-size: 9px !important;
          }

          .ec-mobile-bottom-item
          .ec-mobile-bottom-icon {
            font-size: 21px !important;
          }

          .ec-mobile-more-list {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        /*
          =====================================================
          TRES PETITS TELEPHONES
          =====================================================
        */

        @media (max-width: 360px) {

          .ec-mobile-bottom-item
          .ec-mobile-bottom-icon {
            font-size: 19px !important;
          }

          .ec-mobile-bottom-item {
            font-size: 8px !important;
          }

          .ec-mobile-bottom-nav {
            height: 64px !important;
          }
        }
      }

      /*
        =====================================================
        IMPRESSION
        =====================================================
      */

      @media print {

        .ec-mobile-bottom-nav,
        .ec-mobile-more-panel,
        .ec-mobile-more-backdrop {
          display: none !important;
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

        if (isLogoutItem(item)) {
          item.classList.add(
            "ec-mobile-logout-item"
          );
        }
      }
    );
  }

  function closeMoreMenu(
    morePanel,
    moreBackdrop
  ) {
    if (morePanel) {
      morePanel.classList.remove(
        "ec-open"
      );
    }

    if (moreBackdrop) {
      moreBackdrop.classList.remove(
        "ec-open"
      );
    }
  }

  function openMoreMenu(
    morePanel,
    moreBackdrop
  ) {
    if (morePanel) {
      morePanel.classList.add(
        "ec-open"
      );
    }

    if (moreBackdrop) {
      moreBackdrop.classList.add(
        "ec-open"
      );
    }
  }

  function getCommunicationUnreadCount() {
    const possibleElements =
      Array.from(
        document.querySelectorAll(
          "[class*='badge'], [aria-label]"
        )
      );

    for (
      const element of possibleElements
    ) {
      const text =
        element.textContent?.trim();

      if (
        text &&
        /^[0-9]+$/.test(text) &&
        Number(text) > 0 &&
        Number(text) < 1000
      ) {
        const parentText =
          normalizeText(
            element.parentElement
              ?.textContent || ""
          );

        if (
          parentText.includes(
            "communication"
          )
        ) {
          return text;
        }
      }
    }

    return "";
  }

  function getActiveSidebarItem(
    sidebar
  ) {
    if (!sidebar) {
      return null;
    }

    const items =
      getSidebarItems(sidebar);

    return (
      items.find((item) => {
        const className =
          String(
            item.className || ""
          ).toLowerCase();

        return (
          className.includes("active") ||
          className.includes("selected")
        );
      }) || null
    );
  }

  function createBottomNavigation(
    sidebar
  ) {
    let nav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    if (!nav) {
      nav =
        document.createElement(
          "nav"
        );

      nav.className =
        "ec-mobile-bottom-nav";

      nav.setAttribute(
        "aria-label",
        "Navigation mobile"
      );

      document.body.appendChild(nav);
    }

    const primaryItems = [
      {
        label: "Accueil",
        icon: "🏠",
      },
      {
        label: "Cours",
        icon: "📚",
      },
      {
        label: "Notes",
        icon: "📊",
      },
      {
        label: "Communication",
        icon: "💬",
      },
    ];

    nav.innerHTML = "";

    primaryItems.forEach(
      (definition) => {
        const sidebarItem =
          findItemByLabel(
            sidebar,
            definition.label
          );

        if (!sidebarItem) {
          return;
        }

        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "ec-mobile-bottom-item";

        button.dataset.mobileLabel =
          normalizeText(
            definition.label
          );

        const icon =
          document.createElement(
            "span"
          );

        icon.className =
          "ec-mobile-bottom-icon";

        icon.textContent =
          getItemIcon(
            sidebarItem
          ) || definition.icon;

        const label =
          document.createElement(
            "span"
          );

        label.className =
          "ec-mobile-bottom-label";

        label.textContent =
          definition.label;

        button.appendChild(icon);
        button.appendChild(label);

        if (
          definition.label ===
          "Communication"
        ) {
          const badge =
            getCommunicationUnreadCount();

          if (badge) {
            const badgeElement =
              document.createElement(
                "span"
              );

            badgeElement.className =
              "ec-mobile-bottom-badge";

            badgeElement.textContent =
              badge;

            button.appendChild(
              badgeElement
            );
          }
        }

        button.addEventListener(
          "click",
          function () {
            closeMoreMenu(
              document.querySelector(
                ".ec-mobile-more-panel"
              ),
              document.querySelector(
                ".ec-mobile-more-backdrop"
              )
            );

            if (sidebarItem) {
              sidebarItem.click();
            }

            setTimeout(
              function () {
                updateBottomNavigation(
                  sidebar
                );
              },
              80
            );
          }
        );

        nav.appendChild(button);
      }
    );

    const moreButton =
      document.createElement(
        "button"
      );

    moreButton.type = "button";

    moreButton.className =
      "ec-mobile-bottom-item";

    moreButton.dataset.mobileMore =
      "true";

    const moreIcon =
      document.createElement(
        "span"
      );

    moreIcon.className =
      "ec-mobile-bottom-icon";

    moreIcon.textContent = "☰";

    const moreLabel =
      document.createElement(
        "span"
      );

    moreLabel.className =
      "ec-mobile-bottom-label";

    moreLabel.textContent =
      "Plus";

    moreButton.appendChild(
      moreIcon
    );

    moreButton.appendChild(
      moreLabel
    );

    moreButton.addEventListener(
      "click",
      function () {
        const panel =
          document.querySelector(
            ".ec-mobile-more-panel"
          );

        const backdrop =
          document.querySelector(
            ".ec-mobile-more-backdrop"
          );

        if (
          panel?.classList.contains(
            "ec-open"
          )
        ) {
          closeMoreMenu(
            panel,
            backdrop
          );
        } else {
          openMoreMenu(
            panel,
            backdrop
          );
        }
      }
    );

    nav.appendChild(
      moreButton
    );

    updateBottomNavigation(
      sidebar
    );
  }

  function updateBottomNavigation(
    sidebar
  ) {
    const nav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    if (!nav) {
      return;
    }

    const activeItem =
      getActiveSidebarItem(
        sidebar
      );

    const activeText =
      normalizeText(
        activeItem?.textContent || ""
      );

    nav
      .querySelectorAll(
        ".ec-mobile-bottom-item"
      )
      .forEach((button) => {
        const label =
          normalizeText(
            button.dataset.mobileLabel ||
              ""
          );

        button.classList.toggle(
          "ec-mobile-bottom-active",
          Boolean(
            label &&
              activeText &&
              label === activeText
          )
        );
      });
  }

  function createMoreMenu(
    sidebar
  ) {
    let backdrop =
      document.querySelector(
        ".ec-mobile-more-backdrop"
      );

    if (!backdrop) {
      backdrop =
        document.createElement(
          "div"
        );

      backdrop.className =
        "ec-mobile-more-backdrop";

      document.body.appendChild(
        backdrop
      );
    }

    let panel =
      document.querySelector(
        ".ec-mobile-more-panel"
      );

    if (!panel) {
      panel =
        document.createElement(
          "div"
        );

      panel.className =
        "ec-mobile-more-panel";

      document.body.appendChild(
        panel
      );
    }

    panel.innerHTML = "";

    const title =
      document.createElement(
        "div"
      );

    title.className =
      "ec-mobile-more-title";

    const titleText =
      document.createElement(
        "span"
      );

    titleText.textContent =
      "Plus";

    const closeButton =
      document.createElement(
        "button"
      );

    closeButton.type = "button";

    closeButton.className =
      "ec-mobile-more-close";

    closeButton.setAttribute(
      "aria-label",
      "Fermer"
    );

    closeButton.textContent =
      "✕";

    title.appendChild(
      titleText
    );

    title.appendChild(
      closeButton
    );

    panel.appendChild(title);

    const list =
      document.createElement(
        "div"
      );

    list.className =
      "ec-mobile-more-list";

    const primaryLabels = [
      "accueil",
      "cours",
      "notes",
      "communication",
    ];

    const sidebarItems =
      getSidebarItems(sidebar);

    sidebarItems.forEach(
      (sidebarItem) => {
        const rawLabel =
          sidebarItem.textContent
            ?.trim() || "";

        const normalized =
          normalizeText(
            rawLabel
          );

        if (
          !normalized ||
          primaryLabels.includes(
            normalized
          )
        ) {
          return;
        }

        if (
          normalized ===
            "deconnexion" ||
          normalized ===
            "se deconnecter" ||
          normalized ===
            "logout"
        ) {
          return;
        }

        const item =
          document.createElement(
            "button"
          );

        item.type = "button";

        item.className =
          "ec-mobile-more-item";

        const icon =
          document.createElement(
            "span"
          );

        icon.className =
          "ec-mobile-more-icon";

        icon.textContent =
          getItemIcon(
            sidebarItem
          ) || "•";

        const label =
          document.createElement(
            "span"
          );

        label.className =
          "ec-mobile-more-label";

        label.textContent =
          rawLabel;

        item.appendChild(icon);
        item.appendChild(label);

        item.addEventListener(
          "click",
          function () {
            closeMoreMenu(
              panel,
              backdrop
            );

            sidebarItem.click();

            setTimeout(
              function () {
                updateBottomNavigation(
                  sidebar
                );
              },
              80
            );
          }
        );

        list.appendChild(item);
      }
    );

    /*
      Déconnexion :
      on récupère le vrai bouton React
      afin de conserver son fonctionnement.
    */

    const logoutItem =
      getSidebarItems(
        sidebar
      ).find(
        (item) =>
          isLogoutItem(item)
      );

    if (logoutItem) {
      const logoutButton =
        document.createElement(
          "button"
        );

      logoutButton.type = "button";

      logoutButton.className =
        "ec-mobile-more-item ec-mobile-more-logout";

      const logoutIcon =
        document.createElement(
          "span"
        );

      logoutIcon.className =
        "ec-mobile-more-icon";

      logoutIcon.textContent =
        "🚪";

      const logoutLabel =
        document.createElement(
          "span"
        );

      logoutLabel.className =
        "ec-mobile-more-label";

      logoutLabel.textContent =
        "Déconnexion";

      logoutButton.appendChild(
        logoutIcon
      );

      logoutButton.appendChild(
        logoutLabel
      );

      logoutButton.addEventListener(
        "click",
        function () {
          closeMoreMenu(
            panel,
            backdrop
          );

          logoutItem.click();
        }
      );

      list.appendChild(
        logoutButton
      );
    }

    panel.appendChild(list);

    closeButton.onclick =
      function () {
        closeMoreMenu(
          panel,
          backdrop
        );
      };

    backdrop.onclick =
      function () {
        closeMoreMenu(
          panel,
          backdrop
        );
      };
  }

  function markMainContent(sidebar) {
    if (!sidebar) {
      return;
    }

    const layout =
      sidebar.parentElement;

    if (!layout) {
      return;
    }

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

    const main =
      document.querySelector(
        "main"
      );

    if (main) {
      main.classList.add(
        "ec-mobile-main"
      );
    }
  }

  function removeDesktopMobileArtifacts() {
    /*
      Si on revient en mode desktop,
      on supprime les éléments mobiles.
    */

    const nav =
      document.querySelector(
        ".ec-mobile-bottom-nav"
      );

    const panel =
      document.querySelector(
        ".ec-mobile-more-panel"
      );

    const backdrop =
      document.querySelector(
        ".ec-mobile-more-backdrop"
      );

    if (nav) {
      nav.remove();
    }

    if (panel) {
      panel.remove();
    }

    if (backdrop) {
      backdrop.remove();
    }

    document.body.classList.remove(
      "ec-mobile-menu-active"
    );
  }

  function setupDashboard() {
    if (!isMobile()) {
      removeDesktopMobileArtifacts();
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

    markMainContent(sidebar);

    markLogout(sidebar);

    createBottomNavigation(
      sidebar
    );

    createMoreMenu(
      sidebar
    );
  }

  function run() {
    injectStyles();

    setupDashboard();
  }

  /*
    Les éléments du dashboard React
    peuvent être recréés après un changement
    de page.

    On utilise un petit délai pour éviter
    de reconstruire plusieurs fois de suite.
  */

  let observerTimer = null;

  const observer =
    new MutationObserver(
      function () {
        if (!isMobile()) {
          return;
        }

        if (observerTimer) {
          clearTimeout(
            observerTimer
          );
        }

        observerTimer =
          setTimeout(
            function () {
              setupDashboard();
            },
            80
          );
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
