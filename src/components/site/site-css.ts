// V4 §D rule 4 / §G — THE stylesheet for customer websites. Self-contained (no Tailwind, no external
// fonts, no app URLs) so the same bytes serve the in-app preview, the published site, and the static
// export. Mobile-first; every control ≥ 44px. Themed entirely through CSS variables set by themes.ts.

export const SITE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
.s-body{margin:0;min-height:100dvh;background:var(--s-bg);color:var(--s-text);font-family:var(--s-font-body);line-height:1.55;font-size:17px}
.s-wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.s-header{position:sticky;top:0;z-index:10;background:var(--s-bg);border-bottom:1px solid color-mix(in srgb,var(--s-text) 10%,transparent)}
.s-header .s-wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px}
.s-brand{display:flex;align-items:center;gap:12px;color:var(--s-text);text-decoration:none;font-family:var(--s-font-display);font-weight:var(--s-weight);font-size:20px}
.s-brand img{height:40px;width:auto;max-width:180px;object-fit:contain}
.s-cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:var(--s-radius);background:var(--s-primary);color:#fff;font-weight:700;text-decoration:none;font-size:16px;border:0;cursor:pointer}
.s-cta:hover{filter:brightness(.92)}
.s-cta.s-cta-secondary{background:transparent;color:var(--s-primary);border:2px solid var(--s-primary)}
.s-hero{padding:56px 0}
.s-hero-band{background:var(--s-accent)}
.s-hero-block{background:var(--s-primary);color:#fff}
.s-hero-block .s-muted,.s-hero-block h1{color:#fff}
.s-hero-block .s-cta{background:#fff;color:var(--s-primary)}
.s-hero h1{font-family:var(--s-font-display);font-weight:var(--s-weight);font-size:clamp(30px,5vw,50px);line-height:1.1;margin:0 0 14px;letter-spacing:-.01em}
.s-hero p{font-size:clamp(17px,2vw,20px);margin:0 0 24px;max-width:38em}
.s-hero-grid{display:grid;gap:28px;align-items:center}
@media(min-width:820px){.s-hero-grid.s-has-photo{grid-template-columns:1.1fr .9fr}}
.s-hero img{width:100%;height:auto;border-radius:var(--s-radius);display:block}
.s-actions{display:flex;flex-wrap:wrap;gap:12px}
.s-section{padding:48px 0}
.s-section+.s-section{border-top:1px solid color-mix(in srgb,var(--s-text) 8%,transparent)}
.s-section h2{font-family:var(--s-font-display);font-weight:var(--s-weight);font-size:clamp(24px,3vw,32px);margin:0 0 18px;letter-spacing:-.01em}
.s-muted{color:var(--s-muted)}
.s-grid{display:grid;gap:16px}
@media(min-width:640px){.s-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:960px){.s-grid{grid-template-columns:repeat(3,1fr)}}
.s-card{background:var(--s-surface);border-radius:var(--s-radius);padding:20px}
.s-card h3{margin:0 0 6px;font-size:18px;font-family:var(--s-font-display);font-weight:var(--s-weight)}
.s-card p{margin:0;color:var(--s-muted)}
.s-card.s-featured{outline:2px solid var(--s-primary)}
.s-chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0;padding:0;list-style:none}
.s-chips li{background:var(--s-surface);border-radius:999px;padding:8px 14px;font-size:15px}
.s-prose p{margin:0 0 14px;max-width:44em}
.s-contact{display:grid;gap:20px}
@media(min-width:820px){.s-contact{grid-template-columns:1fr 1fr}}
.s-contact-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.s-contact-list a{color:var(--s-primary);font-weight:600;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.s-form{display:grid;gap:12px}
.s-form label{display:grid;gap:6px;font-size:15px;font-weight:600}
.s-form input,.s-form textarea{min-height:48px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--s-text) 25%,transparent);border-radius:var(--s-radius);font:inherit;background:var(--s-bg);color:var(--s-text)}
.s-form textarea{min-height:120px;resize:vertical}
.s-form .s-hp{position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}
.s-footer{padding:32px 0 48px;border-top:1px solid color-mix(in srgb,var(--s-text) 10%,transparent);color:var(--s-muted);font-size:14px}
.s-footer p{margin:6px 0}
.s-hours{font-size:18px;font-weight:600}
.s-sticky-call{display:none}
@media(max-width:640px){.s-sticky-call{display:flex;position:fixed;left:16px;right:16px;bottom:16px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.18)} .s-body{padding-bottom:88px}}
`;
