import normalizeText from "../../../utils/normalizeText";
import { PERMISSION_CATALOG } from "./permissionCatalog";

const OTHERS_TITLE = "Otros permisos";

/**
 * Cruza los permisos de la base de datos con el catálogo del sistema.
 *  · groups: lo que se muestra, en el orden del catálogo, filtrado por la búsqueda.
 *  · missing: permisos del catálogo que todavía no están en la base de datos (falta el seeder).
 * Los permisos de la base de datos que no están en el catálogo van a "Otros permisos".
 */
export const buildPermissionGroups = (dbPermissions, query = "") => {
  const idByName = new Map(dbPermissions.map((permission) => [permission.name, permission.id]));
  const knownNames = new Set();
  const term = normalizeText(query.trim());
  const matches = (...texts) => !term || normalizeText(texts.join(" ")).includes(term);

  const groups = [];
  const missing = [];

  PERMISSION_CATALOG.forEach((group) => {
    const items = [];

    group.permissions.forEach((permission) => {
      knownNames.add(permission.name);
      const id = idByName.get(permission.name);

      if (id === undefined) {
        missing.push(permission.name);
        return;
      }

      if (matches(permission.label, permission.description, group.title)) {
        items.push({ id, name: permission.name, label: permission.label, description: permission.description });
      }
    });

    if (items.length > 0) groups.push({ title: group.title, items });
  });

  const extras = dbPermissions
    .filter((permission) => !knownNames.has(permission.name) && matches(permission.name))
    .map((permission) => ({ id: permission.id, name: permission.name, label: permission.name, description: "" }));

  if (extras.length > 0) groups.push({ title: OTHERS_TITLE, items: extras });

  return { groups, missing };
};