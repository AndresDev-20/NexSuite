import api from "./client";

// Contrato asumido: ajústalo aquí si tus rutas son otras
export const PERMISSIONS_PATH = "/permissions";
export const ROLE_PERMISSIONS_PATH = "/role-permissions";

/** Respuesta del backend: { success, data } o directamente el dato. */
export const unwrap = (response) => response?.data?.data ?? response?.data;

/** Acepta una lista, o un objeto con la lista dentro de "permissions". */
export const extractList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.permissions)) return value.permissions;
  return [];
};

export const getPermissionName = (permission) =>
  permission.namePermission ?? permission.namePermissio ?? permission.name ?? `Permiso ${permission.id}`;

export const normalizePermission = (permission) => ({
  id: Number(permission.id),
  name: getPermissionName(permission),
});

/** Sirve tanto para filas de RolePermission como para permisos sueltos. */
export const toPermissionId = (item) => {
  if (item?.permissionId != null) return Number(item.permissionId);
  if (item?.permission?.id != null) return Number(item.permission.id);
  return item?.id != null ? Number(item.id) : null;
};

/** Si el backend responde 404 cuando un rol no tiene permisos, lo tratamos como lista vacía. */
const emptyOn404 = (error) => (error?.response?.status === 404 ? { data: [] } : Promise.reject(error));

export const fetchPermissionCatalog = async () => {
  const response = await api.get(PERMISSIONS_PATH);
  return extractList(unwrap(response)).map(normalizePermission);
};

export const fetchRolePermissionRows = async (roleId) => {
  const response = await api.get(`${ROLE_PERMISSIONS_PATH}/role/${roleId}`).catch(emptyOn404);
  return extractList(unwrap(response));
};

/** Nombres de los permisos de un rol. Si las filas no traen el permiso, se buscan en el catálogo. */
export const resolvePermissionNames = (rows, catalog) => {
  const nameById = new Map(catalog.map((permission) => [permission.id, permission.name]));

  return rows
    .map((row) => {
      if (row?.permission) return getPermissionName(row.permission);
      const id = toPermissionId(row);
      return id === null ? undefined : nameById.get(id);
    })
    .filter(Boolean);
};