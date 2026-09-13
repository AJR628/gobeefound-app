import type { TaskDefinition } from "../types";

// Module 6 — Social Presence. Optional by default; promoted for beauty/photography/food (§11.5).
// Platform coverage is trade-dependent (archetype.socialPlatforms). No LinkedIn/TikTok/X.

export const MODULE_6_TASKS: TaskDefinition[] = [
  {
    id: "6.1",
    moduleId: "social",
    title: "Decide which platforms are worth your time",
    order: 1,
    isRequired: false,
    timeEstimate: "5 minutes",
    whyItMatters:
      "Social media is not required to get customers in most local trades. It's a time sink if you pick the wrong one. Pick at most one or two, or none.",
    whatYouNeed: ["An honest sense of how much time you have."],
    doThis:
      "Read our recommendation for your trade below. If it says Facebook, set up a Facebook page in the next step and skip Instagram. If it says both, do both. If you have no time, skip this module entirely — your Google profile matters far more.",
    primaryCta: { label: "I've decided" },
    steps: [
      { text: "Facebook: useful for most local trades because local community groups live there, and that's where neighbors ask for recommendations." },
      { text: "Instagram: worth it only if your work is visual — detailing, landscaping, food, beauty, photography." },
      { text: "Everything else: not in your first year." },
    ],
    troubleshooting: [],
    mistakes: ["Setting up five accounts and posting on none of them. Dead accounts look worse than no accounts."],
    alternatives: [],
    canonicalFields: [],
    reusesFields: [],
    dependsOn: [],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "6.2",
    moduleId: "social",
    title: "Set up your page and save the link",
    order: 2,
    isRequired: false,
    timeEstimate: "20 minutes per platform",
    whyItMatters:
      "A business page with your real name, phone, hours, and website is a second front door. Everything it asks for is already saved — this is copy and paste.",
    whatYouNeed: ["Your logo or a clean photo of your name.", "A cover photo from your set.", "The details below."],
    doThis:
      "Create a business page (not a personal profile) on the platform(s) you chose. Fill in every field from the list below — name, phone, website, hours, and the short description from the Description Generator. Then save the page link below.",
    primaryCta: { label: "Draft your bio", toolId: "descriptions" },
    steps: [
      { heading: "Facebook", text: "Create a Page, choose the Business category, and fill in the About section with the exact values below. Use your logo as the profile photo and your best job photo as the cover." },
      { heading: "Instagram", text: "Create an account, switch it to a Business account in settings, and put your website and the short description in the bio. Use the same profile photo as Facebook." },
      { heading: "Save the links", text: "Copy the URL of each page and save it below." },
    ],
    troubleshooting: [
      { heading: "I used my personal profile for the business", text: "Create a proper Page now. Personal profiles for businesses violate Facebook's terms and can't be found the same way." },
    ],
    mistakes: ["Different phone or hours here than on Google.", "Leaving the About section empty."],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["displayName", "phone", "domain", "hours", "shortDescription", "email"],
    createsAsset: "facebook",
    toolId: "descriptions",
    verifyVariant: {
      title: "Check your social pages",
      intro: "You already have social accounts. Confirm:",
      checks: [
        "Each is a business page, not a personal profile.",
        "The name, phone, website, and hours match what's in Your Business exactly.",
        "Save each page's link below.",
      ],
    },
    dependsOn: ["6.1"],
    sourceLinks: [
      { label: "Facebook — Create a Page", href: "https://www.facebook.com/business/help/104002523024878" },
      { label: "Instagram — Set up a business account", href: "https://help.instagram.com/502981923235522" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "6.3",
    moduleId: "social",
    title: "Post your first three posts",
    order: 3,
    isRequired: false,
    timeEstimate: "20 minutes",
    whyItMatters:
      "An empty page looks abandoned. Three posts make it look like a business. You don't need a content plan — you need three photos with a sentence each.",
    whatYouNeed: ["Three photos from your set."],
    doThis:
      "Post three times: a before-and-after with one sentence about the job, a photo of you with one sentence about what you do and where, and a finished result with one sentence. That's it. Post one more whenever you finish a job you're proud of.",
    primaryCta: { label: "I've posted three" },
    steps: [
      { text: "Post 1: before-and-after. \"Fence gate in Centennial — hinges replaced, closes right again.\"" },
      { text: "Post 2: you. \"I'm Dave. I do small home repairs across Aurora and the south metro.\"" },
      { text: "Post 3: a finished job and where it was." },
    ],
    troubleshooting: [],
    mistakes: ["Posting stock images or quotes. Post your work.", "Feeling obligated to post daily. Once a week is plenty; once a month is fine."],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["services", "serviceAreas"],
    dependsOn: ["6.2"],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
];
