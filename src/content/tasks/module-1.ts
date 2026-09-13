import type { TaskDefinition } from "../types";

// Module 1 — Foundation. Free. No service offers (P11).
// Authored first for the handyman archetype; universal wording.

export const MODULE_1_TASKS: TaskDefinition[] = [
  {
    id: "1.1",
    moduleId: "foundation",
    title: "Say what you do and who you do it for",
    order: 1,
    isRequired: true,
    timeEstimate: "10 minutes",
    whyItMatters:
      "Every profile, post, and web page you make from here on starts with these two sentences. Get them right once and you'll never stare at a blank box again.",
    whatYouNeed: ["Nothing. Just think about your last three jobs."],
    doThis:
      "Finish these two sentences in plain words, the way you'd say them to a neighbor: \"I do ___ for ___.\" and \"People pick me because ___.\" Skip anything that sounds like an ad.",
    primaryCta: { label: "Write it below" },
    steps: [
      {
        heading: "What you do",
        text: "Name the actual work, not a category. \"Small home repairs, drywall patching, and fixture swaps\" beats \"handyman services.\"",
      },
      {
        heading: "Who you help",
        text: "Picture the customer who calls you most. Homeowners? Landlords with a few rentals? Property managers? Pick the one you want more of.",
      },
      {
        heading: "Why you",
        text: "One or two honest reasons. Showing up when you said you would counts. Being licensed counts. \"Best in town\" does not — nobody believes it and we won't print it.",
      },
    ],
    troubleshooting: [
      {
        heading: "I do a bit of everything",
        text: "List the three things you get asked for most. You can always add more later. A short clear list gets more calls than a long vague one.",
      },
    ],
    mistakes: [
      "Writing for search engines instead of people. Nobody searches for \"premier residential solutions.\"",
      "Listing every service you could technically do. List the ones you want to do.",
    ],
    alternatives: [],
    canonicalFields: ["idealCustomer", "differentiators"],
    reusesFields: ["displayName"],
    dependsOn: [],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "1.2",
    moduleId: "foundation",
    title: "Set your service area",
    order: 2,
    isRequired: true,
    timeEstimate: "5 minutes",
    whyItMatters:
      "Google, your website, and your customers all need the same answer to \"do you come to my area?\" Deciding it now stops you quoting jobs an hour away.",
    whatYouNeed: ["A rough idea of how far you're willing to drive."],
    doThis:
      "List the cities and towns you'll actually take jobs in — start with your own and add the ones you'd drive to without grumbling. Five to ten places is normal. Don't list a whole state.",
    primaryCta: { label: "Add your areas below" },
    steps: [
      { text: "Start with the city you're based in." },
      { text: "Add the neighboring cities you'd happily drive to for a normal-sized job." },
      {
        text: "Stop when you reach about a 30–45 minute drive. Google recommends service areas stay within roughly a two-hour radius, and most owners regret going that wide.",
      },
    ],
    troubleshooting: [
      {
        heading: "I'll go anywhere for the right job",
        text: "List where you go for a normal job. Big one-off jobs can be handled case by case — they don't need to be on your website.",
      },
    ],
    mistakes: [
      "Listing every town in the county to look bigger. It attracts calls you'll turn down and can get a Google profile flagged.",
      "Forgetting your own city because it felt obvious.",
    ],
    alternatives: [],
    canonicalFields: ["serviceAreas"],
    reusesFields: ["city", "state"],
    dependsOn: [],
    sourceLinks: [
      {
        label: "Google — Service-area business guidelines",
        href: "https://support.google.com/business/answer/9157481",
      },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "1.3",
    moduleId: "foundation",
    title: "List your services",
    order: 3,
    isRequired: true,
    timeEstimate: "10 minutes",
    whyItMatters:
      "This list becomes your website's services section, your Google services, and the answer when someone asks \"do you do X?\" Write it once here.",
    whatYouNeed: ["Your last month of jobs, roughly."],
    doThis:
      "Write down each service as a customer would ask for it — \"TV mounting,\" not \"AV installation.\" Then pick how you price: by the hour, by the job, or a mix. You don't need to publish prices; just decide your approach.",
    primaryCta: { label: "Add your services below" },
    steps: [
      { text: "List 5–12 services. Each one should be something you'd happily be called for tomorrow." },
      {
        text: "Add a one-line description only where the name isn't obvious. \"Drywall repair — holes, cracks, and water damage patches\" helps. \"Painting — we paint\" doesn't.",
      },
      {
        heading: "Pricing approach",
        text: "Hourly works for unpredictable repair work. Flat-rate works for things you've done fifty times. Most handymen do a mix and quote a minimum call-out. Pick what you'll actually stick to.",
      },
    ],
    troubleshooting: [
      {
        heading: "I don't want to publish prices",
        text: "You don't have to, and for most trades you shouldn't. This is about deciding how you charge so your quotes are consistent. Your website will say \"free estimates\" or similar.",
      },
    ],
    mistakes: [
      "Using trade jargon customers don't search for.",
      "Listing services you can't yet do well because you might one day.",
    ],
    alternatives: [],
    canonicalFields: ["services", "pricingApproach"],
    reusesFields: [],
    dependsOn: [],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "1.4",
    moduleId: "foundation",
    title: "Decide how customers reach you",
    order: 4,
    isRequired: true,
    timeEstimate: "15 minutes",
    whyItMatters:
      "Your phone number is about to go on Google, your website, your truck, and your cards. Once it's out there, changing it costs you customers for years. Decide it once, deliberately.",
    whatYouNeed: ["Your current phone.", "Ten minutes to think honestly about how you like to be contacted."],
    doThis:
      "Pick the one number customers will call and text, and decide whether you'd rather they call, text, or fill out a form. If you'll use your personal cell, that's fine to start — just know it becomes your business number permanently the moment it's on Google.",
    primaryCta: { label: "Save your number below" },
    steps: [
      {
        heading: "Personal cell or a second line?",
        text: "Your personal cell is free and already with you. A second line (a cheap second SIM, or a business calling app) lets you silence work on Sundays and hand the number to an employee later. Either is fine — but whichever you pick, don't change it after this.",
      },
      {
        heading: "How do you want to be reached?",
        text: "If you're on a ladder all day, texts and a website form beat calls. If you close jobs by talking, calls win. Pick one as your preferred method; your website will lead with it.",
      },
      {
        heading: "Set up voicemail",
        text: "Record a short greeting with your business name and when you'll call back. A missed call with no greeting is a customer who calls the next name on the list.",
      },
    ],
    troubleshooting: [
      {
        heading: "I already gave out my personal number",
        text: "Then it's your business number. Don't split it now — consistency beats a fresh start.",
      },
    ],
    mistakes: [
      "Putting a number on Google, then changing it a month later. Old numbers live on the internet forever.",
      "No voicemail greeting, or a full mailbox.",
    ],
    alternatives: [
      {
        heading: "Business calling apps",
        text: "Apps that give you a second number on your existing phone exist and are inexpensive. They're a reasonable choice if you want to separate work and personal without a second device. Pick one and stick with it.",
      },
    ],
    canonicalFields: ["phone", "preferredContact"],
    reusesFields: [],
    verifyVariant: {
      title: "Check your business phone setup",
      intro: "You said you already have a business number. Two quick checks:",
      checks: [
        "Is this the number you'll keep for years? If not, decide now — before it goes on Google.",
        "Does it have a voicemail greeting with your business name?",
        "Save the number below so it's used everywhere from here on.",
      ],
    },
    dependsOn: [],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "1.5",
    moduleId: "foundation",
    title: "Set your hours",
    order: 5,
    isRequired: true,
    timeEstimate: "5 minutes",
    whyItMatters:
      "Google shows your hours before your phone number. \"Closed\" at 9am on a Tuesday sends the customer to someone else — even if you were actually working.",
    whatYouNeed: ["An honest answer about when you'll pick up the phone."],
    doThis:
      "Set the hours you'll answer calls and messages — not the hours you're on a job. If that's \"by appointment,\" say so. Confirm your time zone so Google shows the right hours.",
    primaryCta: { label: "Set your hours below" },
    steps: [
      {
        text: "Set the hours customers can reach you. For most solo operators that's something like Mon–Fri 7–6 and Sat 8–2.",
      },
      {
        text: "If you work by appointment and don't want fixed hours, choose \"by appointment\" — Google supports that and it's honest.",
      },
      {
        heading: "Time zone",
        text: "We've suggested the time zone your device is in. Check it's right — this is what Google and your website will use to display your hours.",
      },
    ],
    troubleshooting: [
      {
        heading: "My hours change week to week",
        text: "Set the hours you can reliably be reached, not the hours you work. You can update them any time from Your Business, and you should before holidays.",
      },
    ],
    mistakes: [
      "Setting 24/7 to look available. Customers who call at midnight and get voicemail leave one-star reviews.",
      "Forgetting to update hours before a holiday week.",
    ],
    alternatives: [],
    canonicalFields: ["hours", "timezone"],
    reusesFields: [],
    dependsOn: [],
    sourceLinks: [
      { label: "Google — Set your business hours", href: "https://support.google.com/business/answer/3370250" },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "1.6",
    moduleId: "foundation",
    title: "Check what you need to operate legally",
    order: 6,
    isRequired: false,
    timeEstimate: "20–30 minutes of reading, on your state's official sites",
    whyItMatters:
      "Some trades need a license, some need to register, and almost everyone owes some kind of tax. Finding out now is cheap. Finding out from a fine isn't.",
    whatYouNeed: ["Your state (we have it).", "Your trade (we have that too)."],
    doThis:
      "Use the official links below for your state to check four things: whether your trade needs a license, whether you need to register your business name, whether you need to collect sales tax, and whether insurance is required. GoBeeFound isn't qualified to tell you the answers — but these are the right places to look.",
    primaryCta: { label: "Open your state's official resources" },
    steps: [
      {
        heading: "Licensing",
        text: "Search your state's licensing site for your trade. Some trades are licensed statewide, some by city, some not at all. Write down what you find.",
      },
      {
        heading: "Business registration",
        text: "If you're operating under a name other than your own, most states want it registered. Your Secretary of State site is where that happens.",
      },
      {
        heading: "Sales tax",
        text: "Whether you collect it depends on your state and what you sell. Your state's department of revenue has the rules.",
      },
      {
        heading: "Insurance",
        text: "General liability isn't always legally required, but many customers and landlords will ask for it. An insurance agent can quote it in a phone call.",
      },
    ],
    troubleshooting: [
      {
        heading: "This is confusing and I'm not sure",
        text: "That's normal. A one-hour consult with a local accountant or a small-business attorney is the right move, and cheaper than getting it wrong. GoBeeFound can't advise on this — we can only point you to the official sources.",
      },
    ],
    mistakes: [
      "Assuming you don't need a license because a competitor doesn't have one.",
      "Taking legal or tax advice from a checklist app. Including this one.",
    ],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["state"],
    dependsOn: [],
    sourceLinks: [
      {
        label: "U.S. SBA — Apply for licenses and permits",
        href: "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits",
      },
    ],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
];
