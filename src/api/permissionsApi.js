import api from "./client";

export const PERMISSIONS_PATH = "/permissions";
export const ROLE_PERMISSIONS_PATH = "/role-permissions";
const ME_PATH = "/users/me";

/** Respuesta del backend: { success, data } o directamente el dato. */
export const unwrap = (response) => response?.data?.data ?? response?.data;

/** Acepta una lista, o un objeto con la lista dentro de "permissions". */
export const extractList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.permissions)) return value.permissions;
  return [];
};

const getPermissionName = (permission) => permission.namePermission ?? `Permiso ${permission.id}`;

/** code (modulo.accion) es lo que exige el backend; name es solo el texto de la base de datos. */
export const normalizePermission = (permission) => ({
  id: Number(permission.id),
  code: permission.code ?? "",
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

/**
 * Permisos del usuario autenticado y la marca de su rol si es del sistema ("developer",
 * "administrador" o null). Solo exige sesión, no un permiso.
 */
export const fetchMyAccess = async () => {
  const me = unwrap(await api.get(ME_PATH));
  return { permissions: me?.permissions ?? [], systemKey: me?.role?.systemkey ?? null };
};
