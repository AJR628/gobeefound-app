// Content types — §17.3. Content is code. These types are the contract the
// build-time validator (scripts/validate-content.ts) enforces.

export const BUSINESS_PROFILE_FIELDS = [
  "displayName",
  "legalName",
  "phone",
  "email",
  "streetAddress",
  "hideAddress",
  "serviceAreas",
  "hours",
  "timezone",
  "services",
  "pricingApproach",
  "idealCustomer",
  "differentiators",
  "logoUrl",
  "brandColors",
  "shortDescription",
  "gbpDescription",
  "longDescription",
  "domain",
  "pageTitle",
  "metaDescription",
  "reviewLink",
  "preferredContact",
  "responseCommitment",
] as const;
export type BusinessProfileField = (typeof BUSINESS_PROFILE_FIELDS)[number];

/** Fields a task may surface in "Your details, ready to use" (§10.2 element 5). */
export type ReusableField = BusinessProfileField | "city" | "state";

export const ASSET_TYPES = ["website", "gbp", "facebook", "instagram", "booking", "other"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const TOOL_IDS = ["website_copy", "descriptions", "review_requests"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const SERVICE_PLACEMENTS = ["task_3_1", "task_3_4", "home_footer", "your_business_footer"] as const;
export type ServicePlacement = (typeof SERVICE_PLACEMENTS)[number];

export const MODULE_IDS = [
  "foundation",
  "name_domain_assets",
  "website",
  "google",
  "reviews",
  "social",
  "first_customers",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const ARCHETYPE_IDS = [
  "handyman",
  "cleaning",
  "landscaping",
  "licensed_trade",
  "mobile_service",
  "beauty",
  "photography",
  "food",
  "pet_services",
  "other",
] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export type ServiceAreaType = "atCustomer" | "atMyLocation" | "both";
export type YesNoUnsure = "yes" | "no" | "unsure";

export const ONBOARDING_ASSET_ANSWERS = [
  "hasDomain",
  "hasWebsite",
  "hasEmail",
  "hasPhone",
  "hasGBP",
  "hasSocial",
  "hasReviews",
] as const;
export type OnboardingAssetAnswer = (typeof ONBOARDING_ASSET_ANSWERS)[number];
export type OnboardingAnswers = Record<OnboardingAssetAnswer, YesNoUnsure>;

/** Authoring status. Drafts render with a visible badge and are excluded from DoD. */
export type ContentStatus = "draft" | "complete";

export interface StepBlock {
  heading?: string;
  text: string;
  /** Optional screenshot path. At most one per collapsed section (§10.7). */
  image?: string;
}

export interface SourceLink {
  label: string;
  href: string;
}

export interface VerifyVariant {
  title: string;
  intro: string;
  checks: string[];
}

export interface TaskDefinition {
  id: string; // e.g. "1.1" — a content string, never a DB foreign key
  moduleId: ModuleId;
  title: string;
  order: number;
  isRequired: boolean;
  /** e.g. "15 minutes · then a wait of up to a few days" (P14) */
  timeEstimate: string;
  whyItMatters: string;
  whatYouNeed: string[];
  doThis: string;
  primaryCta: { label: string; href?: string; toolId?: ToolId };
  steps: StepBlock[];
  troubleshooting: StepBlock[];
  mistakes: string[];
  alternatives: StepBlock[];
  /** BusinessProfile columns this task WRITES (element 12). */
  canonicalFields: BusinessProfileField[];
  /** Known values this task SURFACES with copy controls (element 5, P16). */
  reusesFields: ReusableField[];
  createsAsset?: AssetType;
  toolId?: ToolId;
  serviceOffer?: ServicePlacement;
  /** Only tasks 3.4 and 4.2 may set this (§18.2). */
  supportsAwaitingVerification?: boolean;
  /** Renders as an "adapted" step when the matching onboarding answer is `yes` (§10.6). */
  verifyVariant?: VerifyVariant;
  dependsOn: string[];
  sourceLinks: SourceLink[];
  /** ISO date. Reviewed quarterly (§22.5). */
  lastReviewed: string;
  contentStatus: ContentStatus;
}

export interface ModuleDefinition {
  id: ModuleId;
  /** Human number used in task IDs ("1" for foundation). */
  number: number;
  name: string;
  objective: string;
  isOptional: boolean;
  /** Free for every account (only Module 1 in V1). */
  isFree: boolean;
}

export interface ArchetypeDefinition {
  id: ArchetypeId;
  name: string;
  /** Noun used in copy substitution, e.g. "handyman", "mobile detailer". */
  tradeNoun: string;
  /** Module order EXCLUDING name_domain_assets, which is always second (§11.4). */
  modulePriority: Exclude<ModuleId, "name_domain_assets">[];
  promoteToRequired: string[];
  hide: string[];
  socialPlatforms: ("facebook" | "instagram")[];
  socialNote: string;
}

export type Severity = "critical" | "important" | "minor";

export interface SurfaceExpectation {
  fieldKey: BusinessProfileField;
  appearsOn: AssetType[];
  severity: Severity;
  explanation: string;
}

export type MilestoneCondition =
  | { type: "module_required_complete"; moduleId: ModuleId }
  | { type: "tasks_complete"; taskIds: string[] }
  | { type: "stage_launched" };

export interface MilestoneDefinition {
  id: "foundation_set" | "reachable" | "findable" | "trusted" | "launched";
  label: string;
  /** Plain statement of what is now true about the business (§6 step 9). */
  whatIsNowTrue: string;
  condition: MilestoneCondition;
}

export interface StateResource {
  stateCode: string;
  stateName: string;
  businessRegistrationUrl: string;
  licensingUrl: string;
  taxUrl: string;
}
