
// src/demo/demoData.js

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

const demoUser = {
  id: 1,
  cc: "1000000001",
  firstNames: "Administrador Demo",
  lastNames: "NexSuite",
  email: "admin@demo.nexsuite.test",
  role: "Administrador",
};

let demoBranches = [
  {
    id: 1,
    nameBranch: "Sede Principal",
    address: "Centro, Ibagué, Tolima",
    email: "principal@demo.nexsuite.test",
    number: "3000000001",
    web: "",
    users: [
      {
        id: 1,
        firstNames: "Administrador Demo",
        lastNames: "NexSuite",
      },
    ],
  },
  {
    id: 2,
    nameBranch: "Sucursal Norte",
    address: "Zona Norte, Ibagué, Tolima",
    email: "norte@demo.nexsuite.test",
    number: "3000000002",
    web: "",
    users: [],
  },
  {
    id: 3,
    nameBranch: "Sucursal Centro",
    address: "Centro, Rovira, Tolima",
    email: "centro@demo.nexsuite.test",
    number: "3000000003",
    web: "",
    users: [],
  },
];

export const demoLogin = async ({ cc, password }) => {
  if (cc !== "1000000001" || password !== "Demo1234") {
    const error = new Error("Credenciales de demostración incorrectas.");
    error.isDemoAuthError = true;
    throw error;
  }

  return {
    token: "demo-token-no-valido-para-produccion",
    user: { ...demoUser },
  };
};

export const getDemoUser = () => ({ ...demoUser });

export const getDemoBranches = () =>
  demoBranches.map((branch) => ({
    ...branch,
    users: branch.users.map((user) => ({ ...user })),
  }));

export const createDemoBranch = (payload) => {
  const branch = {
    id: Math.max(0, ...demoBranches.map((item) => item.id)) + 1,
    nameBranch: payload.nameBranch,
    address: payload.address ?? "",
    email: payload.email ?? "",
    number: payload.number ?? "",
    web: payload.web ?? "",
    users: [],
  };

  demoBranches = [...demoBranches, branch];

  return { ...branch, users: [] };
};