const SUPABASE_URL = "https://fzgkaolxngitwlatsusf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2thb2x4bmdpdHdsYXRzdXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTE5MDAsImV4cCI6MjEwODI2NzkwMH0.l_l4MV9Scu7PTZLztGam8DP7HGRCh93fCosA4R3m5P4";
const SUPABASE_STORAGE_KEY = "sb-fzgkaolxngitwlatsusf-auth-token";
const CFT_URL = "https://cubanfashioner-del.github.io/CFT-sitio-oficial/";
const LOGIN_URL = "https://cubanfashioner-del.github.io/Login/html/login.html";

const form = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const usernameField = document.querySelector("#username-field");
const phoneInput = document.querySelector("#phone");
const phoneCountryCodeInput = document.querySelector("#phone-country-code");
const phoneField = document.querySelector("#phone-field");
const consentInput = document.querySelector("#terms-consent");
const consentField = document.querySelector("#consent-field");
const emailField = document.querySelector("#email-field");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const confirmPasswordInput = document.querySelector("#confirm-password");
const confirmPasswordLabel = confirmPasswordField.querySelector("label");
const submitButton = document.querySelector("#login-submit");
const submitLabel = submitButton.querySelector(".login-submit-label");
const message = document.querySelector("#login-message");
const passwordToggle = document.querySelector("#password-toggle");
const forgotPasswordLink = document.querySelector("#forgot-password");
const accountPrompt = document.querySelector("#account-prompt");
const currentYear = document.querySelector("#current-year");

let supabaseClient = null;
let createClientPromise = null;
let isRegisterMode = false;
let isRecoveryMode = false;

currentYear.textContent = String(new Date().getFullYear());

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
  usernameField.hidden = !registerMode;
  usernameInput.disabled = !registerMode;
  usernameInput.required = registerMode;
  phoneField.hidden = !registerMode;
  phoneInput.disabled = !registerMode;
  phoneInput.required = registerMode;
  phoneCountryCodeInput.disabled = !registerMode;
  phoneCountryCodeInput.required = registerMode;
  consentField.hidden = !registerMode;
  consentInput.disabled = !registerMode;
  consentInput.required = registerMode;
  confirmPasswordLabel.textContent = recoveryMode ? "Confirmar nueva contraseña" : "Confirmar contraseña";
  confirmPasswordField.hidden = !passwordSetupMode;
  confirmPasswordInput.disabled = !passwordSetupMode;
  confirmPasswordInput.required = passwordSetupMode;
  passwordInput.minLength = passwordSetupMode ? 6 : 0;
  passwordInput.autocomplete = passwordSetupMode ? "new-password" : "current-password";
  forgotPasswordLink.hidden = passwordSetupMode;
  setMessage("");
}

function updatePhoneValidity() {
  const nationalNumber = phoneInput.value.replace(/\D/g, "");
  const internationalNumber = `${phoneCountryCodeInput.value}${nationalNumber}`;
  const isValid = /^\+[1-9][0-9]{6,14}$/.test(internationalNumber);
  phoneInput.setCustomValidity(
    !nationalNumber || isValid
      ? ""
      : "Introduce un número válido para el código de país seleccionado."
  );
}

phoneInput.addEventListener("input", updatePhoneValidity);
phoneCountryCodeInput.addEventListener("change", updatePhoneValidity);

async function getSupabaseClient() {
  if (!SUPABASE_URL.startsWith("https://") || !SUPABASE_ANON_KEY) {
    throw new Error("CONFIGURATION");
  }

  if (!supabaseClient) {
    if (!createClientPromise) {
      createClientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
        .then(({ createClient }) => createClient)
        .catch((error) => {
          createClientPromise = null;
          throw error;
        });
    }
    const createClient = await createClientPromise;
    try {
      window.localStorage.removeItem(SUPABASE_STORAGE_KEY);
    } catch (error) {
      console.warn("No se pudo limpiar una sesión persistente anterior.", error);
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: window.sessionStorage
      }
    });
  }

  return supabaseClient;
}

function clearPersistentSession() {
  try {
    window.localStorage.removeItem(SUPABASE_STORAGE_KEY);
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  if (isRegisterMode) updatePhoneValidity();
  if (!form.reportValidity()) return;

  if ((isRegisterMode || isRecoveryMode) && passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Las contraseñas no coinciden.");
    confirmPasswordInput.reportValidity();
    confirmPasswordInput.focus();
    return;
  }

  setLoading(true, getSubmitLabel());

  try {
    const supabase = await getSupabaseClient();

    if (isRecoveryMode) {
      const { error } = await supabase.auth.updateUser({ password: passwordInput.value });
      if (error) throw error;
      window.location.assign(CFT_URL);
      return;
    }

    const email = emailInput.value.trim();
    if (isRegisterMode) {
      if (!/^[A-Za-z0-9_]{3,30}$/.test(usernameInput.value.trim())) {
        usernameInput.setCustomValidity("Usa entre 3 y 30 letras, números o guiones bajos.");
        usernameInput.reportValidity();
        usernameInput.focus();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordInput.value,
        options: {
          emailRedirectTo: CFT_URL,
          data: {
            username: usernameInput.value.trim().toLowerCase(),
            phone: `${phoneCountryCodeInput.value}${phoneInput.value.replace(/\D/g, "")}`,
            terms_accepted_at: new Date().toISOString(),
            privacy_notice_version: "2026-11-09"
          }
        }
      });

      if (error) {
        if (error.code === "23505" || /profiles_username_lower_idx/i.test(error.message)) {
          throw new Error("Ese nombre de usuario ya está registrado. Elige otro.");
        }
        throw error;
      }
      if (data.session) {
        clearPersistentSession();
        window.location.assign(CFT_URL);
      } else {
        setMessage("Si el registro puede completarse con ese correo, recibirás un mensaje para confirmar la dirección y activar el acceso. Tu nombre de usuario y teléfono quedarán guardados en tu perfil.", "success");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput.value
      });

      if (error) throw error;
      clearPersistentSession();
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

usernameInput.addEventListener("input", () => {
  usernameInput.setCustomValidity("");
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
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: LOGIN_URL
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
    const supabase = await getSupabaseClient();
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

if (window.location.hash === "#registrarse") {
  updateAccountMode(true);
}

initializeAuth();
