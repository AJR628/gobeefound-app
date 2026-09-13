import type { MilestoneDefinition } from "./types";

// §9.2 — the five milestones and their trigger conditions.

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: "foundation_set",
    label: "Foundation set",
    whatIsNowTrue: "You've made the basic decisions everything else depends on.",
    condition: { type: "module_required_complete", moduleId: "foundation" },
  },
  {
    id: "reachable",
    label: "Reachable",
    whatIsNowTrue: "Customers have a real phone number and a real email address to reach you at.",
    condition: { type: "tasks_complete", taskIds: ["1.4", "2.3"] },
  },
  {
    id: "findable",
    label: "Findable",
    whatIsNowTrue: "Customers searching your business name can now find you and call you.",
    condition: { type: "tasks_complete", taskIds: ["3.5", "4.2"] },
  },
  {
    id: "trusted",
    label: "Trusted",
    whatIsNowTrue: "You have a way to collect reviews, and you've asked your first customers.",
    condition: { type: "tasks_complete", taskIds: ["5.1", "5.3"] },
  },
  {
    id: "launched",
    label: "Launched",
    whatIsNowTrue: "Your business is established online, and GoBeeFound has a confirmed record of it.",
    condition: { type: "stage_launched" },
  },
];
