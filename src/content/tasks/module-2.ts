import type { TaskDefinition } from "../types";

// Module 2 — Name, Domain & Assets.

export const MODULE_2_TASKS: TaskDefinition[] = [
  {
    id: "2.1",
    moduleId: "name_domain_assets",
    title: "Lock in one exact business name",
    order: 1,
    isRequired: true,
    timeEstimate: "10 minutes",
    whyItMatters:
      "Google, your bank, your invoices, and your customers all need to see the same name spelled the same way. Three spellings look like three businesses.",
    whatYouNeed: ["The name you've been using.", "Your registration paperwork, if you've registered."],
    doThis:
      "Write your business name exactly as it should appear everywhere — capitalization, spacing, \"LLC\" or not. If it's registered, match the registration. Then check nobody nearby already uses it: search it on Google Maps and your state's business registry.",
    primaryCta: { label: "Save your name below" },
    steps: [
      { text: "Decide the customer-facing name. Usually that's without \"LLC\" — \"Dave's Aurora Detail,\" not \"Dave's Aurora Detail LLC.\"" },
      { text: "Record the legal name separately if it differs. That's what goes on contracts and tax forms." },
      { text: "Search the name on Google Maps in your area. If another business with the same name shows up nearby, consider adjusting yours now — before it's on a truck." },
    ],
    troubleshooting: [],
    mistakes: [
      "Adding your city or services to the name to help with search — \"Dave's Aurora Detail | Best Mobile Detailing Aurora CO.\" Google penalizes it and customers find it odd.",
    ],
    alternatives: [],
    canonicalFields: ["displayName", "legalName"],
    reusesFields: ["displayName"],
    dependsOn: [],
    sourceLinks: [
      { label: "Google — Business name guidelines", href: "https://support.google.com/business/answer/3038177" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "2.2",
    moduleId: "name_domain_assets",
    title: "Buy your domain",
    order: 2,
    isRequired: true,
    timeEstimate: "10 minutes · about $11–12 a year",
    whyItMatters:
      "Your domain is the one piece of your online presence you actually own. Everything else — Google, Facebook, your website host — is rented. Buy it in your own name.",
    whatYouNeed: ["Your exact business name (saved above).", "A card for about $11–12."],
    doThis:
      "Buy yourbusinessname.com at Porkbun. It has a plain interface, the renewal price is the same as the first-year price, WHOIS privacy is included, and it won't try to sell you six add-ons at checkout. Decline anything extra it offers — you need the domain and nothing else.",
    primaryCta: { label: "Buy your domain at Porkbun", href: "https://porkbun.com/" },
    steps: [
      { text: "Search for your business name with .com. Shorter is better; drop \"the\" and \"LLC.\"" },
      { text: "If the .com is available, add it to your cart. One year is fine — you can turn on auto-renew." },
      { text: "Decline the add-ons at checkout: no hosting, no email, no site builder, no SSL. You'll handle email in the next step and the website in Module 3." },
      { text: "Create the account in your own name with an email you'll still have in five years. Not a friend's, not a designer's." },
      { text: "Turn on auto-renew. A lapsed domain is the most avoidable disaster in this whole plan." },
    ],
    troubleshooting: [
      {
        heading: "The .com is taken",
        text: "Try adding your city (\"daveauroradetail.com\") or the word your customers use (\"davedetailing.com\"). Avoid hyphens and unusual endings like .biz — people mistype them. If you must, .co or .net are acceptable.",
      },
      {
        heading: "I'm not sure the name is final",
        text: "Buy it anyway. Twelve dollars is cheap insurance, and if you change the name you've lost twelve dollars.",
      },
    ],
    mistakes: [
      "Buying the domain through a website builder. It ties your domain to their platform and makes leaving painful.",
      "Letting someone else register it for you. If it's not in your account, it's not yours.",
      "Buying five variations \"just in case.\" One good .com is enough.",
    ],
    alternatives: [
      {
        heading: "I already own a domain somewhere else",
        text: "Keep it there. There's no reason to move a working domain. Save it below and skip to the next step — you'll point it at your site in Module 3.",
      },
    ],
    canonicalFields: ["domain"],
    reusesFields: ["displayName"],
    createsAsset: "website",
    verifyVariant: {
      title: "Check your domain is really yours",
      intro: "You said you already have a domain. Confirm these before we build on it:",
      checks: [
        "You can log in to the registrar account it's held in. If someone else registered it for you, get access transferred now.",
        "Auto-renew is on and the card on file is current.",
        "Save the domain below so we use it everywhere from here on.",
      ],
    },
    dependsOn: ["2.1"],
    sourceLinks: [{ label: "Porkbun — Knowledge base", href: "https://kb.porkbun.com/" }],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "2.3",
    moduleId: "name_domain_assets",
    title: "Set up a business email on your domain",
    order: 3,
    isRequired: true,
    timeEstimate: "15 minutes · about $8–9 per user/month",
    whyItMatters:
      "yourname@yourbusiness.com makes you look like a real business. A gmail address quietly costs you jobs on bigger quotes.",
    whatYouNeed: ["Your domain (done in the last step).", "A card — about $8–9 per user per month, month to month, no annual commitment."],
    doThis:
      "Set up Google Workspace Business Starter on your domain. It's the same Gmail you already know, with your own address on it, and there's nothing new to learn. Choose the Flexible plan so you're billed monthly and can cancel any time.",
    primaryCta: { label: "Set up Google Workspace", href: "https://workspace.google.com/business/signup/welcome" },
    steps: [
      { text: "Start the Business Starter sign-up. When asked, say you already have a domain, and enter the one you bought." },
      { text: "Choose the Flexible plan (monthly). You can switch to annual later if you want the discount." },
      { text: "Create your first address — usually yourfirstname@yourdomain.com or hello@yourdomain.com." },
      { text: "Google will ask you to prove you own the domain by adding a record at Porkbun. Google's setup screen shows the exact record; paste it into Porkbun's DNS page for your domain. Google's own guide walks through it." },
      { text: "Send yourself a test email from your old address. When it arrives, you're done." },
    ],
    troubleshooting: [
      {
        heading: "Verification is stuck",
        text: "DNS changes can take up to a few hours to be seen. Wait, then click verify again. Check the record at Porkbun matches Google's screen exactly — extra spaces are the usual culprit.",
      },
    ],
    mistakes: [
      "Setting up email with the domain registrar or web host because it was bundled. It's usually worse, and you'll want to move later.",
      "Making the email account someone else's login. It's your business's front door — hold the keys.",
    ],
    alternatives: [
      {
        heading: "Free options, and their catch",
        text: "Some registrars and hosts include basic email forwarding for free — mail to hello@yourdomain.com lands in your gmail. It works for receiving, but replies come from your gmail address, which undoes the point. Fine as a stopgap; not a long-term answer.",
      },
      {
        heading: "Does this connect to Google Business Profile?",
        text: "Not specifically. Managing a Google Business Profile needs a Google account — any Google account, including a free one. A Workspace account is a Google account, so it works, but you don't need Workspace for that.",
      },
    ],
    canonicalFields: ["email"],
    reusesFields: ["domain", "displayName"],
    verifyVariant: {
      title: "Check your business email",
      intro: "You said you already have a business email address. Confirm:",
      checks: [
        "It's on your own domain (yourname@yourbusiness.com), not a gmail or provider address.",
        "You're the account owner and can reset the password yourself.",
        "Save the address below so it's used everywhere from here on.",
      ],
    },
    dependsOn: ["2.2"],
    sourceLinks: [
      { label: "Google Workspace — Flexible Plan billing", href: "https://knowledge.workspace.google.com/admin/billing/flexible-plan" },
      { label: "Google Workspace — Verify your domain", href: "https://support.google.com/a/answer/60216" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "2.4",
    moduleId: "name_domain_assets",
    title: "Gather your photo set",
    order: 4,
    isRequired: true,
    timeEstimate: "An hour, spread over your next few jobs",
    whyItMatters:
      "Your website, Google profile, and social pages all need photos, and they all stall without them. Ten decent phone photos taken this week unblock three modules at once.",
    whatYouNeed: ["Your phone.", "Your next two or three jobs."],
    doThis:
      "Take these shots over your next few jobs and keep them in one album on your phone: your vehicle with signage, you working, three before-and-afters, three finished results, and one clear photo of your face. No editing, no filters. Good light and a steady hand are enough.",
    primaryCta: { label: "I've got my photos" },
    steps: [
      { heading: "The shot list", text: "1) Your vehicle, side-on, in daylight. 2) You at work, mid-task. 3–5) Three before-and-after pairs. 6–8) Three finished jobs. 9) A friendly photo of you — customers hire people. 10) Any tools or equipment that show you're serious." },
      { heading: "How to take them", text: "Wipe the lens. Stand so the light is behind you. Hold the phone level. Take three of each and keep the best. Landscape for the vehicle and finished work; portrait for you." },
      { heading: "Name them", text: "Rename each photo on your phone with what it shows — \"drywall-repair-after.jpg\" — so you can find them when Google and your website ask." },
    ],
    troubleshooting: [
      {
        heading: "I don't have finished work to photograph yet",
        text: "Photograph a job for a friend or family member — real work is real work. Or start with your vehicle and yourself, and add job photos as you do them. Don't use stock photos; customers can tell.",
      },
    ],
    mistakes: [
      "Stock photos. They read as fake and they usually are.",
      "Blurry, dark, or cluttered backgrounds. Move the ladder out of the shot.",
      "No photo of you. People hire people they can picture.",
    ],
    alternatives: [],
    canonicalFields: [],
    reusesFields: [],
    dependsOn: [],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "2.5",
    moduleId: "name_domain_assets",
    title: "Sort out a simple logo and two colors",
    order: 5,
    isRequired: false,
    timeEstimate: "20 minutes",
    whyItMatters:
      "You do not need a logo to get customers. Your name in a clean font is fine for the first year. If you want one anyway, here's the 20-minute version — and then move on.",
    whatYouNeed: ["Nothing you don't already have."],
    doThis:
      "Pick two colors — one main, one accent — and write them down. If you already have a logo, upload it here so it's ready for your website and profiles. If you don't, your business name in a plain bold font is your logo for now.",
    primaryCta: { label: "Save your colors below" },
    steps: [
      { text: "Pick one main color. Blues and greens read as trustworthy for trades; pick what you'd paint your truck." },
      { text: "Pick one accent color that stands out against it — for buttons and highlights." },
      { text: "If you have a logo file, upload it as a PNG or JPEG. If you only have it on a truck or a card, a clean photo of it is fine for now." },
    ],
    troubleshooting: [],
    mistakes: [
      "Spending a week on a logo before you have customers. It's the most productive-feeling form of procrastination there is.",
      "Paying for a logo pack with twelve variations. You need one.",
    ],
    alternatives: [],
    canonicalFields: ["logoUrl", "brandColors"],
    reusesFields: ["displayName"],
    dependsOn: [],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
];
