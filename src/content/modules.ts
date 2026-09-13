import type { ModuleDefinition } from "./types";

export const MODULES: ModuleDefinition[] = [
  {
    id: "foundation",
    number: 1,
    name: "Foundation",
    objective: "Decide the handful of basics everything else depends on.",
    isOptional: false,
    isFree: true,
  },
  {
    id: "name_domain_assets",
    number: 2,
    name: "Name, Domain & Assets",
    objective:
      "One consistent name, a domain you own, a real email address, and the photos everything else needs.",
    isOptional: false,
    isFree: false,
  },
  {
    id: "website",
    number: 3,
    name: "Your Website",
    objective:
      "Get a simple site live that says what you do, where you work, and how to reach you — or decide to have it built.",
    isOptional: false,
    isFree: false,
  },
  {
    id: "google",
    number: 4,
    name: "Google Business Profile",
    objective: "Get on Google Maps and local search, set up correctly the first time.",
    isOptional: false,
    isFree: false,
  },
  {
    id: "reviews",
    number: 5,
    name: "Reviews",
    objective: "Set up a repeatable way to ask, and get your first few.",
    isOptional: false,
    isFree: false,
  },
  {
    id: "social",
    number: 6,
    name: "Social Presence",
    objective: "Set up only the accounts actually worth your time for your kind of work.",
    isOptional: true,
    isFree: false,
  },
  {
    id: "first_customers",
    number: 7,
    name: "First Customers",
    objective:
      "Get first jobs from people who already know you, and don't lose the leads you get.",
    isOptional: false,
    isFree: false,
  },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<
  ModuleDefinition["id"],
  ModuleDefinition
>;
