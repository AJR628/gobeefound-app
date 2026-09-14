// V4 §D rules 3–4 — the ONE trusted renderer for customer websites. Pure React, no hooks, no client JS,
// no dangerouslySetInnerHTML on any model text. Every string it prints comes from either SiteCopy (validated
// prose) or PublicFacts (canonical, server-injected). Used unchanged by the in-app preview, the published
// site, and the static export (renderToStaticMarkup), so what the owner approves is what ships.
import type { RenderableSite, SectionKey } from "@/lib/site/spec";
import { visibleSections } from "@/lib/site/spec";
import { THEMES } from "./themes";

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
function smsHref(phone: string): string {
  return `sms:${phone.replace(/[^\d+]/g, "")}`;
}
function isSafeHttpUrl(u: string | null): u is string {
  if (!u) return false;
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:";
  } catch {
    return false;
  }
}

/** The primary action as a link + label, resolved from canonical facts. Never from model text. */
export function primaryActionLink(site: RenderableSite): { href: string; label: string } | null {
  const { setup, facts, copy } = site;
  const label = copy.hero.ctaLabel.trim() || (setup.primaryAction === "call" ? "Call now" : setup.primaryAction === "text" ? "Text us" : "Get in touch");
  if (setup.primaryAction === "call" && facts.phone) return { href: telHref(facts.phone), label };
  if (setup.primaryAction === "text" && facts.phone) return { href: smsHref(facts.phone), label };
  if (setup.primaryAction === "form") return { href: "#contact", label };
  if (facts.phone) return { href: telHref(facts.phone), label };
  if (facts.email) return { href: `mailto:${facts.email}`, label };
  return null;
}

export function SiteBody({ site }: { site: RenderableSite }) {
  const { setup, copy, facts, assets, mode } = site;
  const theme = THEMES[setup.theme];
  const sections = new Set<SectionKey>(visibleSections(setup, facts));
  const action = primaryActionLink(site);
  const showLogo = (setup.logoMode === "existing" || setup.logoMode === "generated" || setup.logoMode === "upload") && assets.logoUrl;
  const featured = new Set(setup.featuredServices.map((s) => s.toLowerCase()));
  const heroClass = theme.hero === "band" ? "s-hero s-hero-band" : theme.hero === "block" ? "s-hero s-hero-block" : "s-hero";
  const showForm = setup.primaryAction === "form" && mode !== "export" && site.formEndpoint;
  const areasText = facts.serviceAreas.join(", ");

  return (
    <>
      <header className="s-header">
        <div className="s-wrap">
          <a className="s-brand" href="#top">
            {showLogo ? <img src={assets.logoUrl!} alt={`${facts.businessName} logo`} /> : null}
            {setup.logoMode !== "none" || !showLogo ? <span>{facts.businessName}</span> : null}
          </a>
          {action && (
            <a className="s-cta" href={action.href}>
              {action.label}
            </a>
          )}
        </div>
      </header>

      <main id="top">
        <section className={heroClass}>
          <div className={`s-wrap s-hero-grid${setup.heroStyle === "photo" && assets.heroUrl ? " s-has-photo" : ""}`}>
            <div>
              <h1>{copy.hero.headline}</h1>
              {copy.hero.subheadline && <p className="s-muted">{copy.hero.subheadline}</p>}
              <div className="s-actions">
                {action && (
                  <a className="s-cta" href={action.href}>
                    {action.label}
                  </a>
                )}
                {facts.phone && setup.primaryAction !== "call" && (
                  <a className="s-cta s-cta-secondary" href={telHref(facts.phone)}>
                    Call {facts.phone}
                  </a>
                )}
              </div>
            </div>
            {setup.heroStyle === "photo" && assets.heroUrl && <img src={assets.heroUrl} alt="" />}
          </div>
        </section>

        {sections.has("services") && (
          <section className="s-section" id="services">
            <div className="s-wrap">
              <h2>{copy.services.heading || "Services"}</h2>
              <div className="s-grid">
                {copy.services.items.map((s, i) => (
                  <div key={i} className={`s-card${featured.has(s.name.toLowerCase()) ? " s-featured" : ""}`}>
                    <h3>{s.name}</h3>
                    {s.blurb && <p>{s.blurb}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {sections.has("serviceAreas") && (
          <section className="s-section" id="areas">
            <div className="s-wrap">
              <h2>{copy.serviceAreas.heading || "Where we work"}</h2>
              {copy.serviceAreas.intro && <p className="s-muted">{copy.serviceAreas.intro}</p>}
              <ul className="s-chips">
                {facts.serviceAreas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {sections.has("about") && (
          <section className="s-section s-prose" id="about">
            <div className="s-wrap">
              <h2>{copy.about.heading || `About ${facts.businessName}`}</h2>
              {copy.about.body.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {sections.has("trust") && copy.trust.body && (
          <section className="s-section s-prose" id="why">
            <div className="s-wrap">
              <h2>{copy.trust.heading || "Why customers choose us"}</h2>
              <p>{copy.trust.body}</p>
              {setup.sections.reviews && isSafeHttpUrl(facts.reviewLink) && (
                <p>
                  <a className="s-cta s-cta-secondary" href={facts.reviewLink} target="_blank" rel="noopener noreferrer">
                    Read our Google reviews
                  </a>
                </p>
              )}
            </div>
          </section>
        )}

        {sections.has("hours") && facts.hours && (
          <section className="s-section" id="hours">
            <div className="s-wrap">
              <h2>{copy.hours.heading || "Hours"}</h2>
              <p className="s-hours">{facts.hours}</p>
              {copy.hours.note && <p className="s-muted">{copy.hours.note}</p>}
            </div>
          </section>
        )}

        <section className="s-section" id="contact">
          <div className="s-wrap s-contact">
            <div>
              <h2>{copy.contact.heading || "Get in touch"}</h2>
              {site.notice && (
                <p className="s-card" role="status">
                  <strong>{site.notice}</strong>
                </p>
              )}
              {copy.contact.body && <p className="s-muted">{copy.contact.body}</p>}
              <ul className="s-contact-list">
                {facts.phone && (
                  <li>
                    <a href={telHref(facts.phone)}>Call {facts.phone}</a>
                  </li>
                )}
                {facts.phone && (
                  <li>
                    <a href={smsHref(facts.phone)}>Text {facts.phone}</a>
                  </li>
                )}
                {facts.email && (
                  <li>
                    <a href={`mailto:${facts.email}`}>{facts.email}</a>
                  </li>
                )}
                {setup.sections.address && facts.address && <li>{facts.address}</li>}
                {!facts.address && areasText && <li className="s-muted">Serving {areasText}</li>}
              </ul>
            </div>
            {showForm ? (
              <form className="s-form" method="post" action={site.formEndpoint!}>
                <label>
                  Your name
                  <input name="name" required maxLength={80} autoComplete="name" />
                </label>
                <label>
                  Phone or email
                  <input name="contact" required maxLength={120} autoComplete="tel" />
                </label>
                <label>
                  What do you need?
                  <textarea name="message" required maxLength={1500} />
                </label>
                <input className="s-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <input type="hidden" name="t" value={String(mode === "published" ? Math.floor(Date.now() / 1000) : 0)} />
                <button className="s-cta" type="submit">
                  Send
                </button>
              </form>
            ) : setup.primaryAction === "form" ? (
              <div className="s-card">
                <h3>Send a message</h3>
                <p>{facts.email ? <a href={`mailto:${facts.email}`}>Email {facts.email}</a> : facts.phone ? <a href={smsHref(facts.phone)}>Text {facts.phone}</a> : "Get in touch by phone."}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="s-footer">
        <div className="s-wrap">
          <p>
            <strong>{facts.legalName || facts.businessName}</strong>
            {facts.serviceAreas.length ? ` · ${facts.city}, ${facts.state}` : ""}
          </p>
          {copy.footer.note && <p>{copy.footer.note}</p>}
          {showForm && <p>Messages sent through this form are emailed to the business and are not stored by GoBeeFound.</p>}
        </div>
      </footer>

      {facts.phone && setup.primaryAction === "call" && (
        <a className="s-cta s-sticky-call" href={telHref(facts.phone)}>
          Call {facts.businessName}
        </a>
      )}
    </>
  );
}
