import type { TaskDefinition } from "../types";

// Module 4 — Google Business Profile. Competes with free checklists; wins on P16 (reuse).
// All guidance stays inside published Google policy (P9). Link Google's docs (P2).

export const MODULE_4_TASKS: TaskDefinition[] = [
  {
    id: "4.1",
    moduleId: "google",
    title: "Claim or create your profile",
    order: 1,
    isRequired: true,
    timeEstimate: "20 minutes",
    whyItMatters:
      "This is how people find you on Maps and in the local results. It's free, and right now it matters more than your website.",
    whatYouNeed: ["A Google account (any — including a free one).", "Your exact business name and phone (we have them)."],
    doThis:
      "First, check you qualify: you must meet customers in person — at your place or theirs. Then search Google Maps for your business name. If a listing already exists, claim it. If not, create one. Never create a second profile for a business that already has one.",
    primaryCta: { label: "Open Google Business Profile", href: "https://business.google.com/create" },
    steps: [
      {
        heading: "Do you qualify?",
        text: "You must have in-person contact with customers during stated hours — at your premises or at theirs. Purely online businesses don't qualify. If you visit customers, you're a service-area business and you qualify.",
      },
      {
        heading: "Search first",
        text: "Search Google Maps for your business name and city. If something shows up — even an unclaimed or wrong-looking listing — claim that one. Duplicates get both profiles suspended.",
      },
      {
        heading: "Create or claim",
        text: "Sign in with the Google account you'll keep. Enter your business name exactly as saved below. Choose the category that describes what you ARE (\"Handyman\"), not every service you offer.",
      },
      {
        heading: "Save the link",
        text: "Once created, copy your profile's link from the \"share\" option and save it below so GoBeeFound knows where your profile lives.",
      },
    ],
    troubleshooting: [
      {
        heading: "There's already a listing and I can't claim it",
        text: "Use \"Request access\" on the listing. Google contacts the current owner and gives them a few days to respond. Don't create a new one in the meantime.",
      },
    ],
    mistakes: [
      "Adding your city or services to the business name. \"Dave's Aurora Detail | Mobile Detailing\" violates Google's rules and gets suspended.",
      "Creating a fresh profile when an old one exists.",
    ],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["displayName", "phone"],
    createsAsset: "gbp",
    verifyVariant: {
      title: "Check your Google profile is set up right",
      intro: "You already have a Google Business Profile. Confirm:",
      checks: [
        "You can sign in and manage it — not just see it.",
        "The business name matches exactly what you saved in Your Business. No city, no services added.",
        "There's only one profile for your business on Maps.",
        "Save the profile link below.",
      ],
    },
    dependsOn: ["2.1"],
    sourceLinks: [
      { label: "Google — Guidelines for representing your business", href: "https://support.google.com/business/answer/3038177" },
      { label: "Google — Add or claim your Business Profile", href: "https://support.google.com/business/answer/2911778" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "4.2",
    moduleId: "google",
    title: "Get verified",
    order: 2,
    isRequired: true,
    timeEstimate: "15 minutes · then a wait of a few days",
    whyItMatters:
      "An unverified profile doesn't show up. Verification is Google's proof that you're real — and it's the step most people abandon because of the wait.",
    whatYouNeed: ["Your profile from the last step.", "Possibly: your vehicle, tools, or signage in frame for a video."],
    doThis:
      "Google decides which verification method you get — video, phone, email, or a postcard. Take whichever it offers and complete it once, properly. Then mark this step as waiting; we'll move you to other work while Google reviews it.",
    primaryCta: { label: "Open your profile to verify", href: "https://business.google.com/" },
    steps: [
      {
        heading: "Video verification (most common for service businesses)",
        text: "You'll record a short live video in the app showing proof you run the business: your branded vehicle, tools or equipment, signage, and — if you have a location — the entrance. Walk through it once before recording.",
      },
      {
        heading: "Postcard",
        text: "A code arrives by mail in about a week. Enter it in your profile. Don't edit the profile's name or address while waiting — that restarts the process.",
      },
      {
        heading: "Waiting",
        text: "Video reviews can take up to five business days. Mark this step \"waiting\" and carry on with the rest of your plan.",
      },
    ],
    troubleshooting: [
      {
        heading: "Verification was rejected",
        text: "Usually the video didn't clearly show the business name matching the profile. Re-record with signage, your vehicle, or branded tools clearly readable.",
      },
    ],
    mistakes: [
      "Trying to force a different verification method. Take the one Google offers.",
      "Editing the profile while verification is pending.",
    ],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["displayName"],
    supportsAwaitingVerification: true,
    verifyVariant: {
      title: "Check your profile is verified",
      intro: "You already have a Google profile. Confirm:",
      checks: [
        "Your profile shows as verified when you sign in (no \"verify now\" banner).",
        "It appears when you search your business name on Google Maps.",
      ],
    },
    dependsOn: ["4.1"],
    sourceLinks: [
      { label: "Google — Verify your business", href: "https://support.google.com/business/answer/7107242" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "4.3",
    moduleId: "google",
    title: "Set your name, category, address, and service area",
    order: 3,
    isRequired: true,
    timeEstimate: "15 minutes",
    whyItMatters:
      "These four fields carry most of the weight in whether Google shows you. They also carry most of the risk: get the address setting wrong and your profile can be suspended.",
    whatYouNeed: ["Your service area list (we have it).", "A decision: do customers come to you, or do you go to them?"],
    doThis:
      "Set the name exactly as saved. Pick one primary category for what you are. Then decide address visibility: if customers come to your location, show your address. If you go to customers, hide it — Google requires that for service-area businesses — and list your service areas instead. Make the same choice below so GoBeeFound records it.",
    primaryCta: { label: "Open your profile settings", href: "https://business.google.com/" },
    steps: [
      { heading: "Name", text: "Exactly as saved in Your Business. Nothing added." },
      {
        heading: "Primary category",
        text: "Choose what your business IS — \"Handyman,\" \"Auto detailing service,\" \"Plumber.\" Add secondary categories only for genuine additional services. Check what top-ranking competitors in your city use.",
      },
      {
        heading: "Address — customers come to you",
        text: "Enter your real street address and check the map pin sits on your entrance. Save the same address below and leave \"show my address\" on.",
      },
      {
        heading: "Address — you go to customers",
        text: "Google still needs an address for verification, but you must clear the \"customers visit\" option so it isn't shown publicly. That's a Google rule for service-area businesses, and it protects your home address. Choose \"don't show my address\" below — you don't need to give GoBeeFound the address at all.",
      },
      {
        heading: "Service area",
        text: "Add the cities from your list. Keep it to where you actually work; Google recommends staying within about a two-hour radius.",
      },
    ],
    troubleshooting: [
      {
        heading: "I work from home but also have customers pick up",
        text: "That's \"both.\" Show the address only if you're comfortable with customers arriving there. If not, hide it and handle pick-ups by appointment.",
      },
    ],
    mistakes: [
      "Showing a home address for a service-area business. It's against Google's rules and it's your home.",
      "Painting the whole state as your service area to look bigger.",
      "Picking five categories hoping to rank for all of them.",
    ],
    alternatives: [],
    canonicalFields: ["streetAddress", "hideAddress"],
    reusesFields: ["displayName", "serviceAreas", "city", "state"],
    dependsOn: ["4.1"],
    sourceLinks: [
      { label: "Google — Service-area businesses", href: "https://support.google.com/business/answer/9157481" },
      { label: "Google — Choose a category", href: "https://support.google.com/business/answer/7249669" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "4.4",
    moduleId: "google",
    title: "Fill in hours, phone, website, services, description",
    order: 4,
    isRequired: true,
    timeEstimate: "15 minutes",
    whyItMatters:
      "A complete profile converts. This is what a customer scans in the ten seconds before choosing you or the listing below you — and every value is already saved, ready to paste.",
    whatYouNeed: ["Nothing new. Everything below is already in Your Business."],
    doThis:
      "Work down your profile's Info section and paste in each value from the list below: hours, phone, website, services. Then use the Description Generator for your 750-character description — it's built from facts you've already given us — and paste that in too.",
    primaryCta: { label: "Draft your description", toolId: "descriptions" },
    steps: [
      { text: "Hours: paste the same hours you set in Module 1. If they differ from your website, customers notice." },
      { text: "Phone: your business number. The same one, everywhere." },
      { text: "Website: your domain. Google's own campaign URL builder lets you add tracking so you can see clicks from your profile separately in analytics — optional." },
      { text: "Services: add each service from your list. One line each; no prices required." },
      { text: "Description: paste the generated one. Up to 750 characters, plain, no keyword stuffing — Google rejects promotional or stuffed descriptions." },
    ],
    troubleshooting: [],
    mistakes: [
      "Keyword-stuffing the description. It reads badly and Google may remove it.",
      "Different hours on Google and your website.",
    ],
    alternatives: [],
    canonicalFields: ["gbpDescription"],
    reusesFields: ["hours", "phone", "domain", "services", "serviceAreas"],
    toolId: "descriptions",
    dependsOn: ["4.1"],
    sourceLinks: [
      { label: "Google — Edit your business information", href: "https://support.google.com/business/answer/3039617" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "4.5",
    moduleId: "google",
    title: "Upload your photos",
    order: 5,
    isRequired: true,
    timeEstimate: "10 minutes",
    whyItMatters:
      "Profiles with photos get more calls and more direction requests. You already took the photos in Module 2 — this is just uploading them.",
    whatYouNeed: ["The photo set from Module 2, on your phone."],
    doThis:
      "From your phone, open your profile and add photos: your logo (or a clean shot of your name), a cover photo of your vehicle or your best work, then the rest of the set. Ten is a good start; add a few new ones every month.",
    primaryCta: { label: "Open your profile to add photos", href: "https://business.google.com/" },
    steps: [
      { text: "Logo: your logo if you have one; otherwise a clean photo of your signage or name." },
      { text: "Cover: your strongest single image — the vehicle or a finished job." },
      { text: "Then: you at work, before-and-afters, finished results, your face." },
    ],
    troubleshooting: [],
    mistakes: ["Stock photos. Google can detect them and customers can tell.", "Uploading once and never again. Fresh photos signal an active business."],
    alternatives: [],
    canonicalFields: [],
    reusesFields: [],
    dependsOn: ["4.1"],
    sourceLinks: [
      { label: "Google — Photo guidelines", href: "https://support.google.com/business/answer/6103862" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "4.6",
    moduleId: "google",
    title: "Know what gets profiles suspended",
    order: 6,
    isRequired: true,
    timeEstimate: "5 minutes of reading",
    whyItMatters:
      "You just built something valuable. Almost every suspension traces back to five avoidable mistakes. Five minutes now protects it.",
    whatYouNeed: ["Nothing. Just read."],
    doThis:
      "Read the five tripwires below. If any of them describes your profile right now, fix it today. Then mark this complete.",
    primaryCta: { label: "I've read the five — mark complete" },
    steps: [
      { heading: "1. Extra words in the name", text: "Only your real business name. No city, no services, no taglines." },
      { heading: "2. Showing an address customers can't visit", text: "Service-area businesses must hide their address. A home address shown publicly is the most common suspension." },
      { heading: "3. Duplicate profiles", text: "One business, one profile. If you find a duplicate, request it be removed — don't manage both." },
      { heading: "4. Fake or gated reviews", text: "Never buy reviews, never offer a discount for them, never use a tool that only asks happy customers. All three violate policy and can strip every review you have." },
      { heading: "5. A service area that isn't real", text: "Only list where you actually work." },
    ],
    troubleshooting: [
      {
        heading: "My profile got suspended",
        text: "Fix the violation first, then submit a reinstatement request through Google's form. Be honest about what was wrong. Don't create a new profile.",
      },
    ],
    mistakes: [],
    alternatives: [],
    canonicalFields: [],
    reusesFields: [],
    dependsOn: [],
    sourceLinks: [
      { label: "Google — Business Profile policies", href: "https://support.google.com/business/answer/3038177" },
      { label: "Google — Review policy", href: "https://support.google.com/contributionpolicy/answer/7400114" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
];
