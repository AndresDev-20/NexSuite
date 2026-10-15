import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import "./login.css";
import useAuthentication from "../../hooks/useAuthentication";

// Tiempos de las animaciones (deben coincidir con --power-ms en login.css)
const LOADING_MS = 2400;
const SUCCESS_MS = 900;

/* Logo de NexSuite: sus colores se controlan desde el CSS (bloque .logo) */
function LogoMark({ className = "" }) {
  return (
    <svg
      className={`logo ${className}`}
      viewBox="0 0 240 240"
      role="img"
      aria-label="Símbolo de NexSuite"
    >
      <g className="logo__traces">
        <path d="M71.5 92 H48 L32 76 H16" />
        <path d="M71.5 120 H16" />
        <path d="M71.5 148 H48 L32 164 H16" />
        <path d="M168.5 92 H192 L208 76 H224" />
        <path d="M168.5 120 H224" />
        <path d="M168.5 148 H192 L208 164 H224" />
        <path d="M120 64 V30" />
        <path d="M96 78 L80 62 V42" />
        <path d="M144 78 L160 62 V42" />
        <path d="M120 176 V210" />
        <path d="M96 162 L80 178 V198" />
        <path d="M144 162 L160 178 V198" />
      </g>
      <g className="logo__nodes">
        <circle cx="12" cy="76" r="4" />
        <circle cx="12" cy="120" r="4" />
        <circle cx="12" cy="164" r="4" />
        <circle cx="228" cy="76" r="4" />
        <circle cx="228" cy="120" r="4" />
        <circle cx="228" cy="164" r="4" />
        <circle cx="120" cy="25" r="4" />
        <circle cx="80" cy="37" r="4" />
        <circle cx="160" cy="37" r="4" />
        <circle cx="120" cy="215" r="4" />
        <circle cx="80" cy="203" r="4" />
        <circle cx="160" cy="203" r="4" />
      </g>
      <polygon
        className="logo__hex"
        points="120,64 168.5,92 168.5,148 120,176 71.5,148 71.5,92"
      />
      <polygon
        className="logo__ring"
        points="120,77 157,98 157,142 120,163 83,142 83,98"
      />
      <path className="logo__n" d="M101 143 L101 99 L139 143 L139 99" />
      <g className="logo__dots">
        <circle cx="101" cy="143" r="6" />
        <circle cx="101" cy="99" r="6" />
        <circle cx="139" cy="143" r="6" />
        <circle cx="139" cy="99" r="6" />
      </g>
    </svg>
  );
}

function EyeIcon({ open }) {
  return (
    <svg className="form__eye" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="form__icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="form__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success
  const timers = useRef([]);

  const { logginUser } = useAuthentication(); // Hook para manejar la autenticación (login, logout, etc.)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched"
  });

  // Limpia los temporizadores si el componente se desmonta
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Datos correctos: se muestran en consola y arranca la animación de carga
  const onValid = (data) => {
    console.log("Datos del login:", data);
    logginUser(data);
    setStatus("loading");
    timers.current.push(
      setTimeout(() => setStatus("success"), LOADING_MS),
      setTimeout(() => navigate("/welcome"), LOADING_MS + SUCCESS_MS), // cambia la ruta si es otra
    );
  };

  // Datos incorrectos o incompletos: la tarjeta vibra
  const onInvalid = (formErrors) => {
    console.log("Datos inválidos:", formErrors);
    setShake(true);
  };

  return (
    <main className="login">
      <div className="login__deco" aria-hidden="true">
        <span className="login__hex login__hex--1" />
        <span className="login__hex login__hex--2" />
        <span className="login__hex login__hex--3" />
      </div>

      <header className="login__brand">
        <LogoMark className="login__logo" />
        <p className="login__wordmark">
          <span className="login__wordmark-nex">Nex</span>Suite
        </p>
      </header>

      <section className="login__panel">
        <div
          className={`login__card ${shake ? "login__card--shake" : ""}`}
          onAnimationEnd={() => setShake(false)}
        >
          <h1 className="login__title">Bienvenido</h1>
          <p className="login__subtitle">Ingresa con tu cédula y contraseña</p>

          <form
            className="form"
            onSubmit={handleSubmit(onValid, onInvalid)}
            noValidate
          >
            <div className="form__field">
              <label className="form__label" htmlFor="cedula">
                Número de cédula
              </label>
              <div className="form__control">
                <UserIcon />
                <input
                  id="cedula"
                  className={`form__input form__input--icon ${errors.cedula ? "form__input--invalid" : ""}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="Ej: 1053123456"
                  aria-invalid={errors.cedula ? "true" : "false"}
                  {...register("cc", {
                    required: "Ingresa tu número de cédula",
                    pattern: {
                      value: /^\d{6,10}$/,
                      message: "La cédula debe tener entre 6 y 10 números",
                    },
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                    },
                  })}
                />
              </div>
              {errors.cedula && (
                <p className="form__error" role="alert">
                  {errors.cedula.message}
                </p>
              )}
            </div>

            <div className="form__field">
              <label className="form__label" htmlFor="password">
                Contraseña
              </label>
              <div className="form__control">
                <LockIcon />
                <input
                  id="password"
                  className={`form__input form__input--icon form__input--password ${errors.password ? "form__input--invalid" : ""}`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  aria-invalid={errors.password ? "true" : "false"}
                  {...register("password", {
                    required: "Ingresa tu contraseña",
                    minLength: {
                      value: 6,
                      message: "Debe tener mínimo 6 caracteres",
                    },
                  })}
                />
                <button
                  type="button"
                  className="form__toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="form__error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <a className="form__link" href="#recuperar">
              ¿Olvidaste tu contraseña?
            </a>

            <button className="button button--primary" type="submit">
              <span>Ingresar</span>
              <svg
                className="button__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>

          <p className="login__footer">© {new Date().getFullYear()} NexSuite</p>
        </div>

        {/* Animación de carga: aura de poder alrededor del logo */}
        {status !== "idle" && (
          <div
            className={`login__power power ${status === "success" ? "power--done" : ""}`}
            role="status"
            aria-live="polite"
          >
            <div className="power__stage">
              <span className="power__ring" />
              <span className="power__ring" />
              <span className="power__ring" />
              <span className="power__spikes" />
              <span className="power__aura" />
              <LogoMark className="power__logo" />
            </div>

            <p className="power__text">
              {status === "success"
                ? "¡Acceso concedido!"
                : "Cargando tu poder…"}
            </p>

            <div className="power__bar">
              <span className="power__fill" />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default Login;
