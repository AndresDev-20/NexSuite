const firstWord = (text = "") => text.trim().split(/\s+/)[0] ?? "";

/** "Yeison Andres" + "Marroquin Bernal" → "Yeison Marroquin" */
export const getShortName = (user) =>
  [firstWord(user?.firstNames), firstWord(user?.lastNames)].filter(Boolean).join(" ");

/** "Yeison Andres Marroquin Bernal" */
export const getFullName = (user) =>
  [user?.firstNames, user?.lastNames].filter(Boolean).join(" ");

/** "YM" */
export const getInitials = (user) =>
  `${firstWord(user?.firstNames)[0] ?? ""}${firstWord(user?.lastNames)[0] ?? ""}`.toUpperCase();