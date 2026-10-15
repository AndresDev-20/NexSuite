import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../ui/Icon/Icon";
import ToastContext from "./ToastContext";
import "./toast.css";

const DURATION = { success: 4000, error: 7000 };
const ICON = { success: "check", error: "alert" };

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, type, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION[type]));
    },
    [dismiss]
  );

  // Limpia los temporizadores pendientes si el proveedor se desmonta
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-region">
        {toasts.map((toast) => (
          <div
            className={`toast toast--${toast.type}`}
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <span className="toast__icon">
              <Icon name={ICON[toast.type]} />
            </span>
            <p className="toast__message">{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="x" className="toast__close-icon" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;