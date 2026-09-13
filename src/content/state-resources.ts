import type { StateResource } from "./types";

// §12.4 — state code → OFFICIAL resource URLs. A simple content map, not a rules engine.
// Task 1.6 links these for the owner's confirmed state and shows FEDERAL_FALLBACK when
// a state has no entry. Never show another state's links. Reviewed quarterly (§22.5).
//
// Seeded with a starter set. Add states as signups arrive (§19.4 metric 4).

export const FEDERAL_FALLBACK = {
  label: "U.S. Small Business Administration — Register your business",
  registerUrl: "https://www.sba.gov/business-guide/launch-your-business/register-your-business",
  licensesUrl: "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits",
  taxUrl: "https://www.irs.gov/businesses/small-businesses-self-employed",
};

export const STATE_RESOURCES: StateResource[] = [
  {
    stateCode: "CO",
    stateName: "Colorado",
    businessRegistrationUrl: "https://www.sos.state.co.us/pubs/business/main.htm",
    licensingUrl: "https://dpo.colorado.gov/",
    taxUrl: "https://tax.colorado.gov/business-taxes",
  },
  {
    stateCode: "TX",
    stateName: "Texas",
    businessRegistrationUrl: "https://www.sos.state.tx.us/corp/index.shtml",
    licensingUrl: "https://www.tdlr.texas.gov/",
    taxUrl: "https://comptroller.texas.gov/taxes/",
  },
  {
    stateCode: "FL",
    stateName: "Florida",
    businessRegistrationUrl: "https://dos.fl.gov/sunbiz/",
    licensingUrl: "https://www.myfloridalicense.com/",
    taxUrl: "https://floridarevenue.com/taxes/Pages/default.aspx",
  },
  {
    stateCode: "AZ",
    stateName: "Arizona",
    businessRegistrationUrl: "https://azcc.gov/corporations",
    licensingUrl: "https://roc.az.gov/",
    taxUrl: "https://azdor.gov/business",
  },
  {
    stateCode: "CA",
    stateName: "California",
    businessRegistrationUrl: "https://www.sos.ca.gov/business-programs",
    licensingUrl: "https://www.cslb.ca.gov/",
    taxUrl: "https://www.cdtfa.ca.gov/",
  },
];

export const STATE_RESOURCE_BY_CODE = Object.fromEntries(
  STATE_RESOURCES.map((s) => [s.stateCode, s]),
) as Record<string, StateResource | undefined>;

/** All 50 states + DC for onboarding Q3. Codes only; names for display. */
export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];
