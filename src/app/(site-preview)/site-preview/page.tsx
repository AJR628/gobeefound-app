import { requireBusiness } from "@/lib/current-user";
import { getEntitlement } from "@/lib/entitlement";
import { getOrCreateDraft } from "@/lib/site/draft";
import { derivePublicFacts } from "@/lib/site/facts";
import { getSignedUrl } from "@/lib/storage";
import { SiteBody } from "@/components/site/site-renderer";
import { SITE_CSS } from "@/components/site/site-css";
import { resolvePalette, themeVariables } from "@/components/site/themes";
import type { RenderableSite } from "@/lib/site/spec";

// V4 §D rule 4 — the authenticated live preview of the OWNER'S OWN draft, rendered by the one trusted
// renderer. Loaded inside an iframe on /site. Private: requires the signed-in owner; never indexed.

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function SitePreviewPage() {
  const { user, business, profile } = await requireBusiness();
  const entitled = (await getEntitlement(user.id)) === "launch";
  const draft = await getOrCreateDraft(business.id, profile);
  if (!entitled || !draft.copy) {
    return <div className="p-8 text-center text-sm text-ink-500">{entitled ? "Build your website to see it here." : "Launch required."}</div>;
  }
  const facts = derivePublicFacts(business, profile, draft.setup);
  const [logoUrl, heroUrl] = await Promise.all([getSignedUrl(facts.logoPath), getSignedUrl(draft.setup.heroStyle === "photo" ? draft.setup.heroPhotoPath : null)]);
  const site: RenderableSite = { setup: draft.setup, copy: draft.copy, facts, assets: { logoUrl, heroUrl }, mode: "preview", formEndpoint: "#contact" };
  const vars = themeVariables(draft.setup.theme, resolvePalette(draft.setup.palette, facts.brandColors));

  return (
    <div className="s-body" data-theme={draft.setup.theme} style={vars as React.CSSProperties}>
      {/* SITE_CSS is our own constant stylesheet — never model output. */}
      <style dangerouslySetInnerHTML={{ __html: SITE_CSS }} />
      <SiteBody site={site} />
    </div>
  );
}
