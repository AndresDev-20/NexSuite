import Icon from "../../ui/Icon/Icon";
import "./stateMessage.css";

const StateMessage = ({ icon, title, text, tone = "neutral", children }) => (
  <div
    className={`state-message state-message--${tone}`}
    role={tone === "error" ? "alert" : "status"}
  >
    <span className="state-message__icon">
      <Icon name={icon} />
    </span>
    <h3 className="state-message__title">{title}</h3>
    {text && <p className="state-message__text">{text}</p>}
    {children && <div className="state-message__actions">{children}</div>}
  </div>
);

export default StateMessage;