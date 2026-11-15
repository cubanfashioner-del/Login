(() => {
  const themeButton = document.querySelector("#theme-toggle");
  const themeLabel = document.querySelector("#theme-toggle-label");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const themeKey = "cft-theme";

  if (!themeButton || !themeLabel || !themeColor) {
    console.error("No se pudo inicializar el tema: faltan elementos de control.");
    return;
  }

  const setTheme = (theme) => {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute("aria-label", `Cambiar a modo ${isDark ? "claro" : "oscuro"}`);
    themeButton.title = `Cambiar a modo ${isDark ? "claro" : "oscuro"}`;
    themeLabel.textContent = isDark ? "Claro" : "Oscuro";
    themeColor.content = isDark ? "#0b0f0e" : "#f8f9fa";
  };

  themeButton.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    try {
      localStorage.setItem(themeKey, nextTheme);
    } catch (error) {
      console.warn("No se pudo guardar la preferencia de tema.", error);
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === themeKey && (event.newValue === "light" || event.newValue === "dark")) {
      setTheme(event.newValue);
    }
  });

  setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
})();
