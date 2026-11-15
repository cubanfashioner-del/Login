const SUPABASE_URL = "https://fzgkaolxngitwlatsusf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OurLjIf6vdHNA8Igw1uULw_HbJLyM1P";
const SUPABASE_STORAGE_KEY = "sb-fzgkaolxngitwlatsusf-auth-token";
const CFT_URL = "https://cubanfashioner-del.github.io/CFT-sitio-oficial/";

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
const passwordField = document.querySelector("#password-field");
const passwordInput = document.querySelector("#password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const confirmPasswordInput = document.querySelector("#confirm-password");
const confirmPasswordLabel = confirmPasswordField.querySelector("label");
const otpField = document.querySelector("#otp-field");
const otpInput = document.querySelector("#otp-code");
const resendButton = document.querySelector("#resend-code");
const loginOptions = document.querySelector("#login-options");
const submitButton = document.querySelector("#login-submit");
const submitLabel = submitButton.querySelector(".login-submit-label");
const message = document.querySelector("#login-message");
const passwordToggle = document.querySelector("#password-toggle");
const forgotPasswordLink = document.querySelector("#forgot-password");
const accountPrompt = document.querySelector("#account-prompt");
const currentYear = document.querySelector("#current-year");
const loginTitle = document.querySelector("#login-title");
const loginKicker = document.querySelector(".login-card-kicker");
const loginDescription = document.querySelector(".login-card-heading p");
const otpHelp = document.querySelector("#otp-help");

let supabaseClient = null;
let createClientPromise = null;
let authStep = "login";
let pendingSignupPassword = "";
let resendCooldownUntil = 0;
let resendCooldownTimer = null;

currentYear.textContent = String(new Date().getFullYear());

function setMessage(text, state = "info") {
  message.textContent = text;
  message.dataset.state = state;
  message.hidden = !text;
}

function setLoading(isLoading, label = getSubmitLabel()) {
  submitButton.disabled = isLoading;
  submitButton.setAttribute("aria-busy", String(isLoading));
  submitLabel.textContent = isLoading ? "Procesando…" : label;
}

function getSubmitLabel() {
  switch (authStep) {
    case "signup":
      return "Crear cuenta";
    case "signup-otp":
    case "recovery-otp":
      return "Verificar código";
    case "recovery-email":
      return "Enviar código";
    case "recovery-password":
      return "Guardar contraseña";
    default:
      return "Iniciar sesión";
  }
}

function updateAuthStep(step) {
  authStep = step;
  const isSignup = step === "signup";
  const isSignupOtp = step === "signup-otp";
  const isRecovery = step.startsWith("recovery-");
  const isOtp = isSignupOtp || step === "recovery-otp";
  const showEmail = step === "login" || isSignup || step === "recovery-email";
  const showPassword = step === "login" || isSignup || step === "recovery-password";
  const needsConfirmation = isSignup || step === "recovery-password";

  const copy = {
    login: ["Bienvenido de vuelta", "Iniciar sesión", "Ingresa tus datos para acceder a tu cuenta."],
    signup: ["Únete a CFT", "Crear cuenta", "Crea tu cuenta para acceder a tu espacio de cliente."],
    "signup-otp": ["Confirma tu correo", "Verifica tu correo", "Escribe el código enviado a tu correo para activar tu cuenta."],
    "recovery-email": ["Recuperación de cuenta", "Recuperar contraseña", "Escribe el correo asociado a tu cuenta para enviarte un código."],
    "recovery-otp": ["Recuperación de cuenta", "Verifica el código", "Escribe el código enviado a tu correo para continuar."],
    "recovery-password": ["Recuperación de cuenta", "Crear nueva contraseña", "Elige una contraseña nueva para tu cuenta."]
  }[step];

  loginKicker.textContent = copy[0];
  loginTitle.textContent = copy[1];
  loginDescription.textContent = copy[2];
  submitLabel.textContent = getSubmitLabel();

  emailField.hidden = !showEmail;
  emailInput.disabled = !showEmail;
  emailInput.required = showEmail;
  usernameField.hidden = !isSignup;
  usernameInput.disabled = !isSignup;
  usernameInput.required = false;
  phoneField.hidden = !isSignup;
  phoneInput.disabled = !isSignup;
  phoneInput.required = false;
  phoneCountryCodeInput.disabled = !isSignup;
  phoneCountryCodeInput.required = false;
  consentField.hidden = !isSignup;
  consentInput.disabled = !isSignup;
  consentInput.required = isSignup;
  passwordField.hidden = !showPassword;
  passwordInput.disabled = !showPassword;
  passwordInput.required = showPassword;
  passwordInput.minLength = isSignup || step === "recovery-password" ? 6 : 0;
  passwordInput.autocomplete = step === "login" ? "current-password" : "new-password";
  passwordToggle.hidden = !showPassword;
  confirmPasswordLabel.textContent = step === "recovery-password"
    ? "Confirmar nueva contraseña"
    : "Confirmar contraseña";
  confirmPasswordField.hidden = !needsConfirmation;
  confirmPasswordInput.disabled = !needsConfirmation;
  confirmPasswordInput.required = needsConfirmation;
  otpField.hidden = !isOtp;
  otpInput.disabled = !isOtp;
  otpInput.required = isOtp;
  loginOptions.hidden = step !== "login";

  if (step === "signup" || isSignupOtp) {
    accountPrompt.innerHTML = isSignupOtp
      ? ""
      : '¿Ya tienes una cuenta? <a href="#iniciar-sesion" id="account-toggle">Inicia sesión</a>';
    accountPrompt.hidden = isSignupOtp;
  } else if (isRecovery) {
    accountPrompt.innerHTML = step === "recovery-email"
      ? '¿Recordaste tu contraseña? <a href="#iniciar-sesion" id="account-toggle">Inicia sesión</a>'
      : "";
    accountPrompt.hidden = step !== "recovery-email";
  } else {
    accountPrompt.innerHTML = '¿Aún no tienes cuenta? <a href="#registrarse" id="account-toggle">Regístrate</a>';
    accountPrompt.hidden = false;
  }

  if (isOtp) {
    otpHelp.textContent = `Introduce el código de 6 dígitos enviado a ${emailInput.value.trim()}.`;
    renderResendCooldown();
  } else if (resendCooldownTimer) {
    window.clearInterval(resendCooldownTimer);
    resendCooldownTimer = null;
  }

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
  const code = String(error?.code || "").toLowerCase();
  const details = `${code} ${error?.message || ""}`.toLowerCase();

  if (error?.message === "CONFIGURATION") {
    return "No se pudo configurar el acceso. Revisa la configuración pública de Supabase.";
  }
  if (error?.message === "RECOVERY_SESSION_MISSING") {
    return "El código se validó, pero no se pudo iniciar la sesión de recuperación. Solicita otro código e inténtalo de nuevo.";
  }
  if (/rate.?limit|too many requests|over_email_send_rate_limit|email rate limit/.test(details)) {
    return "Se alcanzó el límite de envíos de códigos. Espera un momento antes de volver a intentarlo.";
  }
  if (/email_not_confirmed|email not confirmed/.test(details)) {
    return "Tu correo todavía no está confirmado. Solicita o introduce el código de verificación.";
  }
  if (/otp_expired|otp_invalid|invalid.*(otp|token)|expired.*(otp|token)|token.*expired/.test(details)) {
    return "El código no es válido o ha expirado. Solicita uno nuevo e inténtalo otra vez.";
  }
  if (/invalid_credentials|invalid login credentials/.test(details) || error?.status === 400 || error?.status === 401) {
    return "El correo electrónico o la contraseña no son correctos.";
  }
  if (/user already registered|already been registered|user_already_exists/.test(details)) {
    return "Ya existe una cuenta con ese correo. Inicia sesión o usa la recuperación de contraseña.";
  }
  if (/password.*(weak|short|length)|weak_password/.test(details)) {
    return "La contraseña no cumple los requisitos. Usa una contraseña más segura.";
  }
  if (!navigator.onLine) {
    return "No hay conexión a Internet. Comprueba tu conexión e inténtalo de nuevo.";
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servicio de autenticación. Comprueba tu conexión e inténtalo de nuevo.";
  }

  return "No se pudo completar la solicitud. Inténtalo de nuevo en unos momentos.";
}

function renderResendCooldown() {
  if (!authStep.endsWith("-otp")) return;
  const remaining = Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000));
  resendButton.disabled = remaining > 0;
  resendButton.textContent = remaining > 0 ? `Reenviar código (${remaining} s)` : "Reenviar código";

  if (remaining === 0 && resendCooldownTimer) {
    window.clearInterval(resendCooldownTimer);
    resendCooldownTimer = null;
  }
}

function startResendCooldown() {
  resendCooldownUntil = Date.now() + 60_000;
  if (resendCooldownTimer) window.clearInterval(resendCooldownTimer);
  renderResendCooldown();
  resendCooldownTimer = window.setInterval(renderResendCooldown, 1000);
}

function isUnconfirmedEmailError(error) {
  return error?.code === "email_not_confirmed" || /email not confirmed/i.test(error?.message || "");
}

passwordToggle.addEventListener("click", () => {
  const shouldShowPassword = passwordInput.type === "password";
  passwordInput.type = shouldShowPassword ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(shouldShowPassword));
  passwordToggle.setAttribute("aria-label", shouldShowPassword ? "Ocultar contraseña" : "Mostrar contraseña");
});

accountPrompt.addEventListener("click", (event) => {
  const accountToggle = event.target.closest("#account-toggle");
  if (!accountToggle) return;
  event.preventDefault();
  updateAuthStep(accountToggle.getAttribute("href") === "#iniciar-sesion" ? "login" : "signup");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  if (authStep === "signup") updatePhoneValidity();
  if (!form.reportValidity()) return;

  if ((authStep === "signup" || authStep === "recovery-password")
    && passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Las contraseñas no coinciden.");
    confirmPasswordInput.reportValidity();
    confirmPasswordInput.focus();
    return;
  }

  setLoading(true);

  try {
    const supabase = await getSupabaseClient();
    const email = emailInput.value.trim();

    if (authStep === "signup") {
      const username = usernameInput.value.trim().toLowerCase();
      const nationalPhoneNumber = phoneInput.value.replace(/\D/g, "");
      if (username && !/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        usernameInput.setCustomValidity("Usa entre 3 y 30 letras, números o guiones bajos.");
        usernameInput.reportValidity();
        usernameInput.focus();
        return;
      }

      const userMetadata = {
        terms_accepted_at: new Date().toISOString(),
        privacy_notice_version: "2026-11-09"
      };
      if (username) userMetadata.username = username;
      if (nationalPhoneNumber) {
        userMetadata.phone = `${phoneCountryCodeInput.value}${nationalPhoneNumber}`;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordInput.value,
        options: { data: userMetadata }
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
        return;
      }

      pendingSignupPassword = passwordInput.value;
      updateAuthStep("signup-otp");
      startResendCooldown();
      setMessage("Te enviamos un código de 6 dígitos. Revisa tu correo y escríbelo aquí para confirmar la cuenta.", "success");
      otpInput.focus();
      return;
    }

    if (authStep === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput.value
      });

      if (error) {
        if (isUnconfirmedEmailError(error)) {
          pendingSignupPassword = passwordInput.value;
          updateAuthStep("signup-otp");
          setMessage("Tu correo todavía no está confirmado. Introduce el código enviado o reenvíalo cuando esté disponible.", "info");
          otpInput.focus();
          return;
        }
        throw error;
      }
      clearPersistentSession();
      window.location.assign(CFT_URL);
      return;
    }

    if (authStep === "recovery-email") {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      updateAuthStep("recovery-otp");
      startResendCooldown();
      setMessage("Si existe una cuenta asociada, recibirás un código de recuperación en tu correo.", "success");
      otpInput.focus();
      return;
    }

    if (authStep === "signup-otp" || authStep === "recovery-otp") {
      const verificationType = authStep === "signup-otp" ? "signup" : "recovery";
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpInput.value.trim(),
        type: verificationType
      });
      if (error) throw error;

      if (verificationType === "signup") {
        if (!data.session && pendingSignupPassword) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: pendingSignupPassword
          });
          if (signInError) throw signInError;
        } else if (!data.session) {
          pendingSignupPassword = "";
          updateAuthStep("login");
          setMessage("Tu correo quedó confirmado. Inicia sesión para continuar.", "success");
          emailInput.value = email;
          return;
        }

        pendingSignupPassword = "";
        clearPersistentSession();
        window.location.assign(CFT_URL);
        return;
      }

      if (!data.session) throw new Error("RECOVERY_SESSION_MISSING");
      updateAuthStep("recovery-password");
      setMessage("Correo verificado. Ahora puedes crear una contraseña nueva.", "success");
      passwordInput.focus();
      return;
    }

    if (authStep === "recovery-password") {
      const { error } = await supabase.auth.updateUser({ password: passwordInput.value });
      if (error) throw error;
      window.location.assign(CFT_URL);
    }
  } catch (error) {
    console.error(`Error en el flujo de autenticación (${authStep}):`, error);
    if (error.message === "Ese nombre de usuario ya está registrado. Elige otro.") {
      setMessage(error.message, "error");
    } else {
      setMessage(showAuthError(error), "error");
    }
  } finally {
    setLoading(false);
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

otpInput.addEventListener("input", () => {
  otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
});

forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();
  updateAuthStep("recovery-email");
  setMessage("Escribe el correo asociado a tu cuenta para recibir un código.", "info");
  emailInput.focus();
});

resendButton.addEventListener("click", async () => {
  if (!authStep.endsWith("-otp") || resendButton.disabled) return;
  resendButton.disabled = true;
  resendButton.setAttribute("aria-busy", "true");
  startResendCooldown();
  setMessage("");

  try {
    const supabase = await getSupabaseClient();
    const email = emailInput.value.trim();

    if (authStep === "signup-otp") {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    }

    startResendCooldown();
    setMessage("Si la solicitud puede procesarse, recibirás un nuevo código en tu correo.", "success");
  } catch (error) {
    console.error("No se pudo reenviar el código:", error);
    setMessage(showAuthError(error), "error");
    renderResendCooldown();
  } finally {
    resendButton.removeAttribute("aria-busy");
  }
});

async function initializeAuth() {
  try {
    const supabase = await getSupabaseClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        updateAuthStep("recovery-password");
        passwordInput.focus();
      }
    });
  } catch (error) {
    console.error("No se pudo inicializar Supabase Auth:", error);
    setMessage(showAuthError(error), "error");
  }
}

if (window.location.hash === "#registrarse") {
  updateAuthStep("signup");
} else {
  updateAuthStep("login");
}

initializeAuth();
