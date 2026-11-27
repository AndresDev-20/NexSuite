import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Select from "../../../components/forms/Select/Select";
import { formatCurrency } from "../../../utils/money";
import { giftChoiceOf } from "./cartOffersLogic";
import { drawDayText } from "./offerApi";
import "./cartOffers.css";

/* Ofertas en el carrito (Fase 31): la etiqueta, los regalos y el resumen. La lógica está en cartOffersLogic.js. */

/** Etiqueta de la oferta en una línea del carrito. */
export const OfferBadge = ({ offer }) =>
  offer ? (
    <span className={`cart-offer cart-offer--${offer.type}`}>
      <Icon name="sparkles" />
      {offer.name}
      {offer.discount > 0 && <strong> − {formatCurrency(offer.discount / 100)}</strong>}
    </span>
  ) : null;

/**
 * Los regalos que le tocan al cliente. Se agregan solos (el primero con existencias); se pueden cambiar por otro de la
 * lista o quitar. onPickUnits({ gift, option, units }) abre el selector de IMEI.
 */
export const GiftLines = ({ gifts, choices, onChange, freeOf, onPickUnits }) =>
  gifts.length > 0 && (
    <ul className="cart-gifts">
      {gifts.map((gift, index) => {
        const chosen = giftChoiceOf(gift, choices, freeOf);
        const set = (productId) => onChange({ ...choices, [gift.idoffer]: { productId, units: [] } });
        return (
          <li key={gift.idoffer} className={`cart-gift ${chosen ? "" : "cart-gift--off"}`.trim()} style={{ "--i": index }}>
            <span className="cart-gift__icon" aria-hidden="true">
              🎁
            </span>
            <div className="cart-gift__body">
              <span className="cart-gift__title">
                <strong>Obsequio</strong> · {gift.name}
                {gift.entitled > 1 && ` · ${gift.entitled} regalos`}
              </span>
              {chosen ? (
                <>
                  {gift.options.length > 1 ? (
                    <Select
                      label="Regalo"
                      options={gift.options.map((option) => ({ value: String(option.idproduct), label: `${option.name}${freeOf && !option.hasserial ? ` (hay ${freeOf(option.idproduct)})` : ""}` }))}
                      value={String(chosen.option.idproduct)}
                      onChange={(event) => set(Number(event.target.value))}
                    />
                  ) : (
                    <span className="cart-gift__name">{chosen.option.name}</span>
                  )}
                  {chosen.option.hasserial && (
                    <div className="cart-gift__units">
                      {chosen.units.map((unit) => (
                        <span key={unit.id} className="pos__unit">
                          {unit.serial}
                        </span>
                      ))}
                      <Button variant="outline" icon="barcode" onClick={() => onPickUnits({ gift, option: chosen.option, units: chosen.units })}>
                        {chosen.units.length ? "Cambiar IMEI" : "Elegir IMEI"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <span className="cart-gift__name">El cliente no lo quiere.</span>
              )}
            </div>
            <div className="cart-gift__side">
              <span className="cart-gift__price">
                <s>{chosen ? formatCurrency(Number(chosen.option.listprice)) : ""}</s>
                <strong>$0</strong>
              </span>
              {chosen ? (
                <button type="button" className="cart-gift__toggle" onClick={() => set(null)}>
                  Quitar
                </button>
              ) : (
                <button type="button" className="cart-gift__toggle" onClick={() => set(gift.options[0].idproduct)}>
                  Volver a agregar
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

/** Fase 57: las rifas en las que participa la compra (para avisarle al cliente). */
export const RaffleNotice = ({ raffles }) =>
  raffles?.length > 0 && (
    <ul className="cart-raffles" aria-label="Rifas">
      {raffles.map((raffle, index) => (
        <li key={raffle.idoffer} className="cart-raffle" style={{ "--i": index }}>
          <span className="cart-raffle__icon" aria-hidden="true">
            🎟️
          </span>
          <span className="cart-raffle__body">
            <strong>Participa en la rifa «{raffle.name}»</strong>
            <small>
              {[raffle.prize && `Premio: ${raffle.prize}`, raffle.drawdate && `Sorteo: ${drawDayText(raffle.drawdate)}`].filter(Boolean).join(" · ")}
            </small>
          </span>
          <span className="cart-raffle__chances">
            <strong>{raffle.chances}</strong>
            <small>{raffle.chances === 1 ? "oportunidad" : "oportunidades"}</small>
          </span>
        </li>
      ))}
    </ul>
  );

/** Resumen de las ofertas aplicadas (para el total). */
export const OffersSummary = ({ offers }) =>
  offers.applied.length > 0 && (
    <div className="cart-offers-summary" role="status">
      <Icon name="sparkles" />
      <span>
        {offers.applied.map((offer) => offer.name).join(" · ")}
        {offers.savings > 0 && (
          <>
            {" "}
            · ahorra <strong>{formatCurrency(offers.savings / 100)}</strong>
          </>
        )}
      </span>
    </div>
  );
