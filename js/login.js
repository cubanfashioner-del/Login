const SUPABASE_URL = "https://fzgkaolxngitwlatsusf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2thb2x4bmdpdHdsYXRzdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTE5MDAsImV4cCI6MjEwODI2NzkwMH0.l_l4MV9Scu7PTZLztGam8DP7HGRCh93fCosA4R3m5P4";
const SUPABASE_STORAGE_KEY = "sb-fzgkaolxngitwlatsusf-auth-token";
const CFT_URL = "https://cubanfashioner-del.github.io/CFT-sitio-oficial/";
const PASSWORD_RESET_REDIRECT = "https://cubanfashioner-del.github.io/Login/html/login.html";
const REMEMBER_PREFERENCE_KEY = "cft-auth-remember";

const form = document.querySelector("#login-form");
const emailField = document.querySelector("#email-field");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const confirmPasswordInput = document.querySelector("#confirm-password");
const confirmPasswordLabel = confirmPasswordField.querySelector("label");
const rememberInput = document.querySelector("#remember-me");
const rememberOption = document.querySelector(".remember-option");
const submitButton = document.querySelector("#login-submit");
const submitLabel = submitButton.querySelector(".login-submit-label");
const message = document.querySelector("#login-message");
const passwordToggle = document.querySelector("#password-toggle");
const forgotPasswordLink = document.querySelector("#forgot-password");
const accountPrompt = document.querySelector("#account-prompt");
const currentYear = document.querySelector("#current-year");

let supabaseClient = null;
let clientPersistence = null;
let createClientPromise = null;
let isRegisterMode = false;
let isRecoveryMode = false;

currentYear.textContent = String(new Date().getFullYear());

try {
  rememberInput.checked = localStorage.getItem(REMEMBER_PREFERENCE_KEY) === "true";
} catch (error) {
  console.warn("No se pudo leer la preferencia de sesión.", error);
}

function setMessage(text, state = "info") {
  message.textContent = text;
  message.dataset.state = state;
  message.hidden = !text;
}

function setLoading(isLoading, label = "Iniciar sesión") {
  submitButton.disabled = isLoading;
  submitButton.setAttribute("aria-busy", String(isLoading));
  submitLabel.textContent = isLoading ? "Procesando…" : label;
}

function getSubmitLabel() {
  if (isRecoveryMode) return "Guardar contraseña";
  return isRegisterMode ? "Crear cuenta" : "Iniciar sesión";
}

function updateAccountMode(registerMode, recoveryMode = false) {
  isRegisterMode = registerMode;
  isRecoveryMode = recoveryMode;
  const passwordSetupMode = registerMode || recoveryMode;

  document.querySelector("#login-title").textContent = recoveryMode
    ? "Crear nueva contraseña"
    : registerMode ? "Crear cuenta" : "Iniciar sesión";
  document.querySelector(".login-card-kicker").textContent = recoveryMode
    ? "Recuperación de cuenta"
    : registerMode ? "Únete a CFT" : "Bienvenido de vuelta";
  document.querySelector(".login-card-heading p").textContent = recoveryMode
    ? "Elige una contraseña nueva para tu cuenta."
    : registerMode
      ? "Crea tu cuenta para acceder a tu espacio de cliente."
      : "Ingresa tus datos para acceder a tu cuenta.";
  submitLabel.textContent = getSubmitLabel();
  accountPrompt.innerHTML = recoveryMode
    ? '¿Ya no necesitas cambiar la contraseña? <a href="#iniciar-sesion" id="account-toggle">Volver al inicio de sesión</a>'
    : registerMode
      ? '¿Ya tienes una cuenta? <a href="#iniciar-sesion" id="account-toggle">Inicia sesión</a>'
      : '¿Aún no tienes cuenta? <a href="#registrarse" id="account-toggle">Regístrate</a>';
  emailField.hidden = recoveryMode;
  emailInput.disabled = recoveryMode;
  emailInput.required = !recoveryMode;
  confirmPasswordLabel.textContent = recoveryMode ? "Confirmar nueva contraseña" : "Confirmar contraseña";
  confirmPasswordField.hidden = !passwordSetupMode;
  confirmPasswordInput.disabled = !passwordSetupMode;
  confirmPasswordInput.required = passwordSetupMode;
  passwordInput.minLength = passwordSetupMode ? 6 : 0;
  passwordInput.autocomplete = passwordSetupMode ? "new-password" : "current-password";
  forgotPasswordLink.hidden = passwordSetupMode;
  rememberOption.hidden = passwordSetupMode;
  setMessage("");
}

async function getSupabaseClient(rememberSession) {
  if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_ANON_KEY) {
    throw new Error("CONFIGURATION");
  }

  if (!supabaseClient || clientPersistence !== rememberSession) {
    if (!createClientPromise) {
      createClientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
        .then(({ createClient }) => createClient)
        .catch((error) => {
          createClientPromise = null;
          throw error;
        });
    }
    const createClient = await createClientPromise;
    const storage = rememberSession ? window.localStorage : window.sessionStorage;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage
      }
    });
    clientPersistence = rememberSession;
  }

  return supabaseClient;
}

function clearOtherSessionStorage(rememberSession) {
  const otherStorage = rememberSession ? window.sessionStorage : window.localStorage;
  try {
    otherStorage.removeItem(SUPABASE_STORAGE_KEY);
  } catch (error) {
    console.warn("No se pudo limpiar una sesión anterior del navegador.", error);
  }
}

function showAuthError(error) {
  if (error.message === "CONFIGURATION") {
    return "No se pudo configurar el acceso. Revisa la configuración pública de Supabase.";
  }

  if (error.status === 400 || error.status === 401) {
    return "El correo electrónico o la contraseña no son correctos.";
  }

  if (!navigator.onLine) {
    return "No hay conexión a Internet. Comprueba tu conexión e inténtalo de nuevo.";
  }

  if (error instanceof TypeError) {
    return "No se pudo conectar con el servicio de autenticación. Comprueba tu conexión e inténtalo de nuevo.";
  }

  return "No se pudo completar la solicitud. Inténtalo de nuevo en unos momentos.";
}

passwordToggle.addEventListener("click", () => {
  const shouldShowPassword = passwordInput.type === "password";
  passwordInput.type = shouldShowPassword ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
  passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Ocultar contraseña" : "Mostrar contraseña");
});

accountPrompt.addEventListener("click", (event) => {
  if (event.target.closest("#account-toggle")) {
    event.preventDefault();
    updateAccountMode(!isRegisterMode && !isRecoveryMode);
  }
});

rememberInput.addEventListener("change", () => {
  try {
    localStorage.setItem(REMEMBER_PREFERENCE_KEY, String(rememberInput.checked));
  } catch (error) {
    console.warn("No se pudo guardar la preferencia de sesión.", error);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  if (!form.reportValidity()) return;

  if ((isRegisterMode || isRecoveryMode) && passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Las contraseñas no coinciden.");
    confirmPasswordInput.reportValidity();
    confirmPasswordInput.focus();
    return;
  }

  setLoading(true, getSubmitLabel());

  try {
    const supabase = await getSupabaseClient(rememberInput.checked);

    if (isRecoveryMode) {
      const { error } = await supabase.auth.updateUser({ password: passwordInput.value });
      if (error) throw error;
      window.location.assign(CFT_URL);
      return;
    }

    const email = emailInput.value.trim();
    if (isRegisterMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordInput.value
      });

      if (error) throw error;
      if (data.session) {
        clearOtherSessionStorage(rememberInput.checked);
        window.location.assign(CFT_URL);
      } else {
        setMessage("Revisa tu correo para confirmar la cuenta y activar el acceso.", "success");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput.value
      });

      if (error) throw error;
      clearOtherSessionStorage(rememberInput.checked);
      window.location.assign(CFT_URL);
    }
  } catch (error) {
    console.error(isRecoveryMode
      ? "Error al actualizar la contraseña:"
      : isRegisterMode ? "Error al crear la cuenta:" : "Error al iniciar sesión:", error);
    setMessage(showAuthError(error), "error");
  } finally {
    setLoading(false, getSubmitLabel());
  }
});

passwordInput.addEventListener("input", () => {
  confirmPasswordInput.setCustomValidity("");
});

confirmPasswordInput.addEventListener("input", () => {
  confirmPasswordInput.setCustomValidity("");
});

forgotPasswordLink.addEventListener("click", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = emailInput.value.trim();
  if (!email) {
    emailInput.focus();
    setMessage("Escribe tu correo electrónico para enviarte el enlace de recuperación.", "error");
    return;
  }

  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  setLoading(true, "Enviar enlace de recuperación");

  try {
    const supabase = await getSupabaseClient(rememberInput.checked);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: PASSWORD_RESET_REDIRECT
    });

    if (error) throw error;
    setMessage("Si existe una cuenta asociada, recibirás un correo con los pasos para restablecer la contraseña.", "success");
  } catch (error) {
    console.error("Error al solicitar el restablecimiento de contraseña:", error);
    setMessage(showAuthError(error), "error");
  } finally {
    setLoading(false, "Iniciar sesión");
  }
});

async function initializeAuth() {
  try {
    const supabase = await getSupabaseClient(rememberInput.checked);
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        updateAccountMode(false, true);
        passwordInput.focus();
      }
    });
  } catch (error) {
    console.error("No se pudo inicializar Supabase Auth:", error);
    setMessage(showAuthError(error), "error");
  }
}

initializeAuth();
