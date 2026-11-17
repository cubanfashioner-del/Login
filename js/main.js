(() => {
      const menuButton = document.querySelector(".menu-toggle");
      const navigation = document.querySelector("#main-navigation");
      const year = document.querySelector("#current-year");
      const modalTriggers = document.querySelectorAll("[data-modal]");
      const networkBackground = document.querySelector(".global-network svg");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      year.textContent = String(new Date().getFullYear());

      let parallaxFrame = 0;
      const updateNetworkParallax = () => {
        if (parallaxFrame) return;

        parallaxFrame = window.requestAnimationFrame(() => {
          const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress = scrollableDistance > 0
            ? Math.min(Math.max(window.scrollY / scrollableDistance, 0), 1)
            : 0;
          const offset = reducedMotion.matches ? 0 : -68 * scrollProgress;

          networkBackground.style.setProperty("--network-parallax-offset", `${offset.toFixed(2)}px`);
          parallaxFrame = 0;
        });
      };

      window.addEventListener("scroll", updateNetworkParallax, { passive: true });
      window.addEventListener("resize", updateNetworkParallax);
      reducedMotion.addEventListener("change", updateNetworkParallax);
      updateNetworkParallax();

      const closeMenu = () => {
        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Abrir menú");
      };

      menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
        navigation.classList.toggle("is-open", !isOpen);
      });

      navigation.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeMenu();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
      });

      modalTriggers.forEach((trigger) => {
        trigger.addEventListener("click", () => {
          const modal = document.getElementById(trigger.dataset.modal);
          if (modal instanceof HTMLDialogElement) {
            modal.showModal();
            document.body.classList.add("modal-open");
          }
        });
      });

      document.querySelectorAll(".modal").forEach((modal) => {
        const closeButton = modal.querySelector(".modal-close");

        closeButton.addEventListener("click", () => modal.close());
        modal.addEventListener("click", (event) => {
          if (event.target === modal) modal.close();
        });
        modal.addEventListener("close", () => {
          if (!document.querySelector(".modal[open]")) {
            document.body.classList.remove("modal-open");
          }
        });
      });
    })();
