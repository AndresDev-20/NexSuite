import Icon from "../Icon/Icon";
import "./button.css";

const Button = ({ variant = "primary", icon, type = "button", className = "", children, ...rest }) => (
  <button type={type} className={`btn btn--${variant} ${className}`.trim()} {...rest}>
    {icon && <Icon name={icon} className="btn__icon" />}
    {children}
  </button>
);

export default Button;