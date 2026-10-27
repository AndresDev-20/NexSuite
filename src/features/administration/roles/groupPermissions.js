import normalizeText from "../../../utils/normalizeText";
import { PERMISSION_CATALOG } from "./permissionCatalog";

const OTHERS_TITLE = "Otros permisos";

/**
 * Cruza los permisos de la base de datos con el catálogo del sistema (por su code).
 *  · groups: lo que se muestra, en el orden del catálogo, filtrado por la búsqueda.
 *  · missing: permisos del catálogo que todavía no están en la base de datos (falta el seeder).
 * Los permisos de la base de datos que no están en el catálogo van a "Otros permisos".
 */
export const buildPermissionGroups = (dbPermissions, query = "") => {
  const idByCode = new Map(dbPermissions.map((permission) => [permission.code, permission.id]));
  const knownCodes = new Set();
  const term = normalizeText(query.trim());
  const matches = (...texts) => !term || normalizeText(texts.join(" ")).includes(term);

  const groups = [];
  const missing = [];

  PERMISSION_CATALOG.forEach((group) => {
    const items = [];

    group.permissions.forEach((permission) => {
      knownCodes.add(permission.code);
      const id = idByCode.get(permission.code);

      if (id === undefined) {
        missing.push(permission.code);
        return;
      }

      if (matches(permission.label, permission.description, group.title)) {
        items.push({ id, code: permission.code, label: permission.label, description: permission.description });
      }
    });

    if (items.length > 0) groups.push({ title: group.title, items });
  });

  const extras = dbPermissions
    .filter((permission) => !knownCodes.has(permission.code) && matches(permission.name, permission.code))
    .map((permission) => ({
      id: permission.id,
      code: permission.code,
      label: permission.name,
      description: permission.code,
    }));

  if (extras.length > 0) groups.push({ title: OTHERS_TITLE, items: extras });

  return { groups, missing };
};
