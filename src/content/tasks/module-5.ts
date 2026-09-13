import type { TaskDefinition } from "../types";

// Module 5 — Reviews. Compliance stated inline (P9): no incentives, no buying, no gating.

export const MODULE_5_TASKS: TaskDefinition[] = [
  {
    id: "5.1",
    moduleId: "reviews",
    title: "Get your review link",
    order: 1,
    isRequired: true,
    timeEstimate: "5 minutes",
    whyItMatters:
      "Every step you remove between \"happy customer\" and \"posted review\" multiplies how many you get. A direct link is the biggest step to remove.",
    whatYouNeed: ["Your verified Google profile."],
    doThis:
      "Sign in to your Google profile and find \"Ask for reviews\" (or \"Get more reviews\"). Copy the short link it gives you and save it below. That's the link you'll text, email, and print from now on.",
    primaryCta: { label: "Open your profile", href: "https://business.google.com/" },
    steps: [
      { text: "In your profile, look for \"Ask for reviews.\" Google shows a short link like g.page/r/…/review." },
      { text: "Copy it and paste it below. GoBeeFound will use it in your review requests and QR code." },
    ],
    troubleshooting: [
      { heading: "I can't find the option", text: "It only appears once your profile is verified. If you're still waiting on verification, come back to this after." },
    ],
    mistakes: ["Sending people to your Maps listing and hoping they find the review button. Send the direct link."],
    alternatives: [],
    canonicalFields: ["reviewLink"],
    reusesFields: ["displayName"],
    dependsOn: ["4.2"],
    sourceLinks: [{ label: "Google — Get your review link", href: "https://support.google.com/business/answer/7035772" }],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "5.2",
    moduleId: "reviews",
    title: "Set up your review requests",
    order: 2,
    isRequired: true,
    timeEstimate: "10 minutes",
    whyItMatters:
      "You won't ask if asking is awkward. A saved text, a saved email, and a card in your truck make it a two-second habit instead of a conversation you dread.",
    whatYouNeed: ["Your review link (saved above)."],
    doThis:
      "Open the Review Request Kit. It builds a text message, an email, a short spoken line for the end of a job, a QR code, and a printable card — all with your link already in them. Save the text message to your phone as a shortcut.",
    primaryCta: { label: "Open the Review Request Kit", toolId: "review_requests" },
    steps: [
      { text: "Read the SMS. Shorten it if it doesn't sound like you. Save it as a text replacement or a note on your phone." },
      { text: "Print the card. Keep a stack in the truck; hand one over with the invoice." },
      { text: "Practice the spoken line once. It's one sentence." },
    ],
    troubleshooting: [],
    mistakes: [
      "Offering a discount for a review. It violates Google's policy and can get all your reviews removed.",
      "Only asking customers you're sure will be positive. Also against policy. Ask everyone.",
    ],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["reviewLink", "displayName"],
    toolId: "review_requests",
    dependsOn: ["5.1"],
    sourceLinks: [{ label: "Google — Tips to get more reviews", href: "https://support.google.com/business/answer/3474122" }],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "5.3",
    moduleId: "reviews",
    title: "Ask your first five, and decide when you'll always ask",
    order: 3,
    isRequired: true,
    timeEstimate: "10 minutes, then a habit",
    whyItMatters:
      "Reviews are the deciding factor in local choice. Consistency beats bursts — a steady trickle looks natural because it is. That only happens if asking is attached to something you already do.",
    whatYouNeed: ["Five recent customers you can text.", "Your saved SMS from the last step."],
    doThis:
      "Text your review request to the last five customers you did good work for. Then pick your trigger — the moment you'll always send it from now on: when you send the invoice, when you mark the job done, or before you leave the driveway. Write it down and stick to it.",
    primaryCta: { label: "I've asked five and picked my trigger" },
    steps: [
      { text: "Send the SMS to five recent customers. Don't overthink it; the message is already written." },
      { text: "Pick one trigger. \"Every time I send an invoice\" is the most reliable because you already do it." },
      { text: "Reply to every review that comes in — see the next step." },
    ],
    troubleshooting: [
      { heading: "Nobody replied", text: "Normal. Roughly one in five people leave a review when asked. Keep asking every customer, every time. Five reviews in your first two months is a good result." },
    ],
    mistakes: [
      "Asking once, getting two reviews, and stopping. The trickle is the point.",
      "Buying reviews. Google removes them and can suspend the profile.",
    ],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["reviewLink"],
    verifyVariant: {
      title: "Check your review habit",
      intro: "You already have some reviews. Confirm:",
      checks: [
        "You have a saved message with your review link that you can send in two seconds.",
        "You've picked a trigger — a moment in every job when you always send it.",
        "You've replied to every review you've received so far.",
      ],
    },
    dependsOn: ["5.2"],
    sourceLinks: [],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
  {
    id: "5.4",
    moduleId: "reviews",
    title: "Know how to reply to reviews",
    order: 4,
    isRequired: true,
    timeEstimate: "5 minutes of reading",
    whyItMatters:
      "You're not writing for the reviewer. You're writing for the next hundred people who read it. An unanswered one-star review does compounding damage; a calm reply turns it into a point in your favor.",
    whatYouNeed: ["Nothing."],
    doThis:
      "Reply to every review within a couple of days. Thank positive ones specifically — name the job. For a negative one, use the calm template from the Review Request Kit: acknowledge, state the facts briefly, offer to fix it offline. Never argue in public.",
    primaryCta: { label: "Get the reply templates", toolId: "review_requests" },
    steps: [
      { heading: "Positive", text: "One or two sentences. Mention what you did for them. \"Thanks Maria — glad the fence gate is finally closing right.\"" },
      { heading: "Negative", text: "Acknowledge, don't excuse. State one fact if the review is wrong. Offer a phone call. Keep it under four sentences. Then stop." },
      { heading: "Fake or off-topic", text: "Report it through your profile. Document why it breaks a specific policy before you flag it." },
    ],
    troubleshooting: [],
    mistakes: ["Arguing. Every word you write to a bad review is read by a future customer.", "Ignoring positive reviews. A reply is free and it encourages the next one."],
    alternatives: [],
    canonicalFields: [],
    reusesFields: ["displayName"],
    toolId: "review_requests",
    dependsOn: [],
    sourceLinks: [{ label: "Google — Manage customer reviews", href: "https://support.google.com/business/answer/3474050" }],
    lastReviewed: "2026-09-13",
    contentStatus: "complete",
  },
];
