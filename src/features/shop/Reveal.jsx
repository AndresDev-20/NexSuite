import { useEffect, useRef, useState } from "react";

/**
 * Aparece suave (opacidad y movimiento) cuando entra en la pantalla al bajar; solo la primera vez.
 * Sin IntersectionObserver (navegadores viejos) se ve de una vez.
 */
const Reveal = ({ as: Tag = "section", className = "", children, ...rest }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.05 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Tag ref={ref} className={`shop-reveal ${visible ? "shop-reveal--in" : ""} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
};

export default Reveal;
