/**
 * Qué billetes y monedas dejar en la caja para la base (Fase 56, decisiones del 2026-11-26). Es el mismo cálculo del
 * servidor (BackEnd/src/utils/keptBills.js): si cambias uno, cambia el otro.
 *
 * Se entrega primero lo grande y se deja lo pequeño (sirve para el cambio), buscando dejar exactamente la base; si no
 * da exacto, se deja lo más cerca por debajo y se avisa cuánto falta. Si lo contado no alcanza, se deja todo.
 *
 * counted: [{ value, count }] (pesos); base: pesos. Devuelve { kept, handover, keptAmount, handoverAmount, missing }.
 */
const UNIT = 50;

export const keptBills = (counted, base) => {
  const rows = counted
    .filter((row) => row.count > 0)
    .map((row) => ({ value: Number(row.value), count: Number(row.count) }))
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum + row.value * row.count, 0);
  const goal = Math.max(Math.round(Number(base) || 0), 0);
  const summary = (handoverCounts) => {
    const handover = rows.map((row, index) => ({ value: row.value, count: handoverCounts[index] })).filter((row) => row.count > 0);
    const kept = rows.map((row, index) => ({ value: row.value, count: row.count - handoverCounts[index] })).filter((row) => row.count > 0);
    const handoverAmount = handover.reduce((sum, row) => sum + row.value * row.count, 0);
    const keptAmount = total - handoverAmount;
    return { kept, handover, keptAmount, handoverAmount, missing: Math.max(goal - keptAmount, 0) };
  };
  if (total <= goal) return summary(rows.map(() => 0));

  const target = Math.ceil((total - goal) / UNIT);
  const max = Math.round(total / UNIT);
  const reachable = new Uint8Array(max + 1);
  reachable[0] = 1;
  rows.forEach((row) => {
    const step = Math.round(row.value / UNIT);
    const used = new Int32Array(max + 1);
    for (let sum = step; sum <= max; sum += 1) {
      if (!reachable[sum] && reachable[sum - step] && used[sum - step] < row.count) {
        reachable[sum] = 1;
        used[sum] = used[sum - step] + 1;
      }
    }
  });
  let goalSum = target;
  while (goalSum <= max && !reachable[goalSum]) goalSum += 1;

  const steps = rows.map((row) => Math.round(row.value / UNIT));
  const failed = new Set();
  const counts = rows.map(() => 0);
  const build = (index, rest) => {
    if (rest === 0) return true;
    if (index >= rows.length) return false;
    const key = `${index}:${rest}`;
    if (failed.has(key)) return false;
    for (let count = Math.min(rows[index].count, Math.floor(rest / steps[index])); count >= 0; count -= 1) {
      counts[index] = count;
      if (build(index + 1, rest - count * steps[index])) return true;
    }
    counts[index] = 0;
    failed.add(key);
    return false;
  };
  build(0, goalSum);
  return summary(counts);
};
