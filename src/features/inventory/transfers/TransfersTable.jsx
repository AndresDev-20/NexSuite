import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatDay } from "../../purchases/orders/orderOptions";
import "./transfers.css";

const unitsText = (count) => `${count} ${count === 1 ? "unidad" : "unidades"}`;

const columns = [
  {
    key: "number",
    header: "Traslado",
    primary: true,
    render: (transfer) => (
      <div className="transfer-cell">
        <strong className="transfer-cell__number">{transfer.number}</strong>
        <span className="transfer-cell__secondary">{formatDay(transfer.date)}</span>
      </div>
    ),
  },
  {
    key: "route",
    header: "De → a",
    render: (transfer) => (
      <span className="transfer-route">
        {transfer.fromName}
        <span className="transfer-route__arrow" aria-label="a">
          →
        </span>
        {transfer.toName}
      </span>
    ),
  },
  {
    key: "items",
    header: "Mercancía",
    render: (transfer) => (
      <div className="transfer-cell">
        <span>{unitsText(transfer.unitCount)}</span>
        <span className="transfer-cell__secondary">
          {transfer.productCount} {transfer.productCount === 1 ? "producto" : "productos"}
        </span>
      </div>
    ),
  },
  { key: "user", header: "Registrado por", render: (transfer) => transfer.createdBy ?? "—" },
];

const TransfersTable = ({ transfers, onView }) => (
  <DataTable
    caption="Traslados entre sucursales"
    columns={columns}
    rows={transfers}
    getRowKey={(transfer) => transfer.id}
    renderActions={(transfer) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver el traslado ${transfer.number}`} onClick={() => onView(transfer)} />
      </RowActions>
    )}
  />
);

export default TransfersTable;
