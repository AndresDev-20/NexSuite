import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getUser } from "../../../utils/session";
import useChats, { CHAT_FILTERS, CHAT_STATUS, formatWaid } from "../useChats";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "./chatsPage.css";

const LIST_REFRESH_MS = 15000;
const DETAIL_REFRESH_MS = 8000;
const SENDER_LABEL = { cliente: "Cliente", bot: "Asistente", vendedor: "Vendedor", sistema: "Sistema" };

const timeOf = (value) =>
  value ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "";

const StatusTag = ({ status }) => <span className={`chat-tag chat-tag--${status}`}>{CHAT_STATUS[status]?.label ?? status}</span>;

/** Una fila de la lista: nombre o número, estado, último mensaje y hace cuánto. */
const ChatRow = ({ chat, selected, onSelect }) => (
  <li>
    <button type="button" className={`chat-row ${selected ? "chat-row--on" : ""}`.trim()} aria-current={selected ? "true" : undefined} onClick={() => onSelect(chat.id)}>
      <span className="chat-row__top">
        <strong className="chat-row__name">{chat.name || formatWaid(chat.waid)}</strong>
        <span className="chat-row__time">{timeOf(chat.lastMessage?.createdat ?? chat.updatedAt)}</span>
      </span>
      <span className="chat-row__middle">
        <StatusTag status={chat.status} />
        {chat.branch && <span className="chat-row__branch">{chat.branch.name}</span>}
        {chat.agent && <span className="chat-row__branch">· {chat.agent.name}</span>}
      </span>
      {chat.lastMessage && (
        <span className="chat-row__last">
          {chat.lastMessage.sender !== "cliente" && `${SENDER_LABEL[chat.lastMessage.sender]}: `}
          {chat.lastMessage.body}
        </span>
      )}
    </button>
  </li>
);

/** Los mensajes como en WhatsApp: el cliente a la izquierda; el asistente y el vendedor a la derecha. */
const Messages = ({ messages }) => {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  return (
    <ol className="chat-messages" aria-label="Mensajes de la conversación">
      {messages.map((message) =>
        message.sender === "sistema" ? (
          <li key={message.id} className="chat-note">
            {message.body} · {timeOf(message.createdAt)}
          </li>
        ) : (
          <li key={message.id} className={`chat-bubble chat-bubble--${message.sender}`}>
            {message.sender !== "cliente" && (
              <span className="chat-bubble__who">{message.sender === "vendedor" ? message.user || "Vendedor" : "Asistente"}</span>
            )}
            <span className="chat-bubble__body">{message.body}</span>
            <span className="chat-bubble__meta">
              {timeOf(message.createdAt)}
              {message.failed && <span className="chat-bubble__failed"> · No se pudo enviar</span>}
            </span>
          </li>
        )
      )}
      <li ref={end} aria-hidden="true" />
    </ol>
  );
};

/**
 * Bandeja «Chats» (Fase 16.2): las conversaciones de WhatsApp. El asistente atiende hasta que el
 * cliente quiere comprar o pide una persona; entonces quedan «esperando» y un vendedor las toma y
 * responde por el mismo WhatsApp. La sucursal activa filtra.
 */
const ChatsPage = () => {
  const toast = useToast();
  const { can } = usePermissions();
  const canReply = can("chats.reply");
  const me = getUser()?.id;
  const { activeBranchId } = useActiveBranch();
  const { items, total, loading, error, getChats, getChat, takeChat, replyChat, closeChat, returnToBot } = useChats();
  const [filter, setFilter] = useState("abiertas");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState({ chat: null, loading: false, error: "" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => {
    const term = search.trim();
    return { ...CHAT_FILTERS.find((item) => item.value === filter).params, ...(activeBranchId && { idbranch: activeBranchId }), ...(term && { search: term }) };
  }, [filter, activeBranchId, search]);

  useEffect(() => {
    getChats(params);
    const timer = setInterval(() => getChats(params, { silent: true }), LIST_REFRESH_MS);
    return () => clearInterval(timer);
  }, [params, getChats]);

  const loadDetail = useCallback(
    async (id, { silent = false } = {}) => {
      if (!silent) setDetail({ chat: null, loading: true, error: "" });
      try {
        const chat = await getChat(id);
        setDetail({ chat, loading: false, error: "" });
      } catch (err) {
        if (!silent) setDetail({ chat: null, loading: false, error: getErrorMessage(err, "No se pudo abrir la conversación.") });
      }
    },
    [getChat]
  );

  useEffect(() => {
    if (!selectedId) return undefined;
    loadDetail(selectedId);
    const timer = setInterval(() => loadDetail(selectedId, { silent: true }), DETAIL_REFRESH_MS);
    return () => clearInterval(timer);
  }, [selectedId, loadDetail]);

  const select = (id) => {
    setSelectedId(id);
    setText("");
  };

  /** Ejecuta una acción sobre la conversación abierta y refresca la lista. */
  const act = async (action, success) => {
    setBusy(true);
    try {
      const chat = await action();
      setDetail({ chat, loading: false, error: "" });
      if (success) toast.success(success);
      getChats(params, { silent: true });
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo completar la acción."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const chat = detail.chat;
  const mine = chat?.status === "atendida" && chat.agent?.id === me;
  const otherAgent = chat?.status === "atendida" && chat.agent && chat.agent.id !== me;
  const canWrite = canReply && chat && chat.status !== "cerrada" && chat.window.open && !otherAgent;

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || !chat) return;
    if (await act(() => replyChat(chat.id, body))) setText("");
  };

  const renderList = () => {
    if (loading && items.length === 0) return <p className="chats-empty">Cargando conversaciones…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los chats" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getChats(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (items.length === 0) {
      return <p className="chats-empty">{filter === "esperando" ? "Nadie está esperando vendedor. 🎉" : "No hay conversaciones con ese filtro."}</p>;
    }
    return (
      <ul className="chats-list" aria-label="Conversaciones">
        {items.map((item) => (
          <ChatRow key={item.id} chat={item} selected={item.id === selectedId} onSelect={select} />
        ))}
      </ul>
    );
  };

  const renderDetail = () => {
    if (!selectedId) return <StateMessage icon="mail" title="Elige una conversación" text="Aquí ves todo lo que habló el cliente con el asistente y le respondes por WhatsApp." />;
    if (detail.loading) return <p className="chats-empty">Abriendo la conversación…</p>;
    if (detail.error) return <StateMessage tone="error" icon="alert" title="No pudimos abrir la conversación" text={detail.error} />;
    if (!chat) return null;
    return (
      <>
        <header className="chat-head">
          <button type="button" className="chat-head__back" onClick={() => setSelectedId(null)} aria-label="Volver a la lista">
            <Icon name="chevron" />
          </button>
          <div className="chat-head__who">
            <strong>{chat.name || formatWaid(chat.waid)}</strong>
            <span>
              {formatWaid(chat.waid)}
              {chat.customer && ` · cliente registrado: ${chat.customer.name}`}
            </span>
          </div>
          <StatusTag status={chat.status} />
        </header>

        {chat.handoffReason && chat.status !== "bot" && (
          <p className="chat-handoff">
            <strong>Motivo:</strong> {chat.handoffReason}
            {chat.branch && ` · ${chat.branch.name}`}
            {chat.agent && ` · la atiende ${chat.agent.id === me ? "tú" : chat.agent.name}`}
          </p>
        )}

        <Messages messages={chat.messages} />

        {canReply && chat.status !== "cerrada" && (
          <div className="chat-actions">
            {(chat.status === "esperando" || chat.status === "bot") && (
              <Button icon="check" disabled={busy} onClick={() => act(() => takeChat(chat.id), "Tomaste la conversación.")}>
                Tomar
              </Button>
            )}
            {(chat.status === "esperando" || mine) && (
              <Button variant="outline" icon="refresh" disabled={busy} onClick={() => act(() => returnToBot(chat.id), "El asistente vuelve a atenderla.")}>
                Devolver al asistente
              </Button>
            )}
            <Button variant="outline" icon="x" disabled={busy} onClick={() => act(() => closeChat(chat.id), "Conversación cerrada.")}>
              Cerrar
            </Button>
          </div>
        )}

        {canReply && chat.status !== "cerrada" && (
          <form className="chat-reply" onSubmit={send}>
            {!chat.window.open ? (
              <p className="chat-reply__note">Pasaron más de 24 horas desde el último mensaje del cliente: WhatsApp no deja escribirle hasta que vuelva a escribir.</p>
            ) : otherAgent ? (
              <p className="chat-reply__note">La atiende {chat.agent.name}.</p>
            ) : (
              <>
                <label className="chats-sr" htmlFor="chat-reply-text">
                  Mensaje para el cliente
                </label>
                <textarea
                  id="chat-reply-text"
                  className="chat-reply__input"
                  rows={2}
                  maxLength={4000}
                  placeholder={chat.status === "atendida" ? "Escribe tu mensaje…" : "Escribe tu mensaje (al enviarlo tomas la conversación)…"}
                  value={text}
                  disabled={!canWrite || busy}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) send(event);
                  }}
                />
                <Button type="submit" icon="mail" disabled={!canWrite || busy || !text.trim()}>
                  Enviar
                </Button>
                {chat.window.closesAt && <p className="chat-reply__hint">Puedes escribirle hasta el {formatDateTime(chat.window.closesAt)}.</p>}
              </>
            )}
          </form>
        )}
      </>
    );
  };

  return (
    <section className="list-page chats-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Chats</h1>
          <p className="list-page__subtitle">WhatsApp del negocio: el asistente responde y, cuando el cliente quiere comprar, lo atiende un vendedor.</p>
        </div>
      </header>

      <div className={`chats ${selectedId ? "chats--detail" : ""}`.trim()}>
        <aside className="list-page__card chats__list">
          <div className="chats__filters">
            <div className="sheet__chips" role="group" aria-label="Filtrar conversaciones">
              {CHAT_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`sheet__chip ${filter === item.value ? "sheet__chip--on" : ""}`.trim()}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              className="chats__search"
              type="search"
              placeholder="Buscar por nombre o número"
              aria-label="Buscar por nombre o número"
              value={search}
              maxLength={60}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="chats__count">
              {total} {total === 1 ? "conversación" : "conversaciones"}
            </span>
          </div>
          {renderList()}
        </aside>
        <section className="list-page__card chats__detail" aria-label="Conversación">
          {renderDetail()}
        </section>
      </div>
    </section>
  );
};

export default ChatsPage;
