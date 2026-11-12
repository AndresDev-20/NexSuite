import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getCatalog } from "./centerApi";
import "../../../styles/listPage.css";
import "./reportCenter.css";

// Los informes por tema; uno que llegue sin tema va en «Otros»
const GROUPS = [
  { title: "Ventas y ganancias", types: ["sales", "profit", "products", "comparison"] },
  { title: "Mercancía", types: ["inventory", "purchases"] },
  { title: "Dinero", types: ["cash", "receivables", "payables", "expenses"] },
];

/**
 * Centro de informes (Fase 23, F1): tarjetas de los informes que el usuario puede abrir, por tema.
 * Cada tarjeta lleva a /informes/:tipo. Los permisos los decide el servidor (catálogo).
 */
const ReportCatalogPage = () => {
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    getCatalog()
      .then((data) => current && setState({ status: "ready", data, error: "" }))
      .catch((error) => current && setState({ status: "error", data: null, error: getErrorMessage(error, "No se pudo cargar el catálogo de informes.") }));
    return () => {
      current = false;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading", data: null, error: "" });
    setAttempt((value) => value + 1);
  };

  const renderContent = () => {
    if (state.status === "loading") {
      return (
        <ul className="report-catalog__grid" aria-label="Cargando informes">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="list-page__skeleton-item report-catalog__skeleton" />
          ))}
        </ul>
      );
    }
    if (state.status === "error") {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los informes" text={state.error}>
          <Button variant="outline" icon="refresh" onClick={retry}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    const allowed = state.data.reports.filter((report) => report.allowed);
    if (allowed.length === 0) {
      return <StateMessage icon="lock" title="No tienes informes asignados" text="Pide a un administrador que te dé permiso para ver algún informe." />;
    }
    const known = GROUPS.flatMap((group) => group.types);
    const groups = [...GROUPS, { title: "Otros", types: allowed.map((report) => report.type).filter((type) => !known.includes(type)) }]
      .map((group) => ({ ...group, reports: group.types.map((type) => allowed.find((report) => report.type === type)).filter(Boolean) }))
      .filter((group) => group.reports.length > 0);
    let order = 0;

    return (
      <div className="report-catalog">
        {groups.map((group) => (
          <section key={group.title} className="report-catalog__group" aria-labelledby={`report-group-${group.title}`}>
            <h2 className="report-catalog__group-title" id={`report-group-${group.title}`}>
              {group.title}
            </h2>
            <ul className="report-catalog__grid">
              {group.reports.map((report) => {
                order += 1;
                const content = (
                  <>
                    <span className="report-card__icon">
                      <Icon name={report.icon} />
                    </span>
                    <span className="report-card__body">
                      <strong className="report-card__title">{report.title}</strong>
                      <span className="report-card__text">{report.description}</span>
                    </span>
                    {report.available ? <Icon name="chevron" className="report-card__arrow" /> : <span className="report-card__soon">Pronto</span>}
                  </>
                );
                return (
                  <li key={report.type} style={{ "--i": order }}>
                    {report.available ? (
                      <Link className="report-card" to={`/informes/${report.type}`}>
                        {content}
                      </Link>
                    ) : (
                      <div className="report-card report-card--disabled" aria-disabled="true">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Informes</h1>
          <p className="list-page__subtitle">
            Elige un informe para ver sus cifras por día o por mes.
            {state.data?.canExport ? " Todos se pueden descargar en Excel y PDF." : ""}
          </p>
        </div>
      </header>
      {renderContent()}
    </section>
  );
};

export default ReportCatalogPage;
