// V4 §I — where owners manage DNS, with a deep link and the one tip that trips people up at each provider.
// Authored content, reviewed quarterly like state-resources.ts. Never instructs a nameserver change.

export interface DnsProviderInfo {
  id: string;
  label: string;
  /** Where the owner adds records. A login page is fine — it lands them in the right place. */
  dnsUrl: string;
  docsUrl: string;
  /** Provider-specific notes, in owner language. */
  tips: string[];
  /** Whether the provider supports a CNAME/ALIAS at the root (so www + root can both point by name). */
  apexAliasSupport: boolean;
  lastReviewed: string;
}

export const DNS_PROVIDERS: DnsProviderInfo[] = [
  {
    id: "porkbun",
    label: "Porkbun",
    dnsUrl: "https://porkbun.com/account/domainsSpeedy",
    docsUrl: "https://kb.porkbun.com/article/68-how-to-edit-dns-records",
    tips: ["Click DNS next to your domain.", "For the root record, leave the Host box empty.", "Porkbun's ALIAS record type works for the root if you prefer a name over an IP."],
    apexAliasSupport: true,
    lastReviewed: "2026-09-14",
  },
  {
    id: "godaddy",
    label: "GoDaddy",
    dnsUrl: "https://dcc.godaddy.com/manage/dns",
    docsUrl: "https://www.godaddy.com/help/add-an-a-record-19238",
    tips: ["Use @ as the Name for the root record.", "GoDaddy may show a 'Parked' A record for @ — edit that one instead of adding a second.", "Leave the nameservers as they are."],
    apexAliasSupport: false,
    lastReviewed: "2026-09-14",
  },
  {
    id: "namecheap",
    label: "Namecheap",
    dnsUrl: "https://ap.www.namecheap.com/domains/list/",
    docsUrl: "https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/",
    tips: ["Open Manage → Advanced DNS.", "Use @ as the Host for the root record.", "If a 'URL Redirect Record' for @ exists, remove it — it conflicts with the A record."],
    apexAliasSupport: true,
    lastReviewed: "2026-09-14",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    dnsUrl: "https://dash.cloudflare.com/",
    docsUrl: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
    tips: ["Open your domain → DNS → Records.", "Set the proxy status to DNS only (grey cloud) for these records so HTTPS can be issued for your site.", "Use @ for the root."],
    apexAliasSupport: true,
    lastReviewed: "2026-09-14",
  },
  {
    id: "squarespace",
    label: "Squarespace Domains (formerly Google Domains)",
    dnsUrl: "https://account.squarespace.com/domains",
    docsUrl: "https://support.squarespace.com/hc/en-us/articles/360002101888",
    tips: ["Open the domain → DNS → Custom records.", "Use @ as the Host for the root record."],
    apexAliasSupport: false,
    lastReviewed: "2026-09-14",
  },
  {
    id: "other",
    label: "Somewhere else",
    dnsUrl: "",
    docsUrl: "",
    tips: ["Look for DNS, DNS records, or Zone editor in your account.", "The root record is usually written @ or left blank.", "Don't change nameservers — only add the records below."],
    apexAliasSupport: false,
    lastReviewed: "2026-09-14",
  },
];

export const DNS_PROVIDER_BY_ID: Record<string, DnsProviderInfo> = Object.fromEntries(DNS_PROVIDERS.map((p) => [p.id, p]));
