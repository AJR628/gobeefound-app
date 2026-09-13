import Link from "next/link";
import { ARCHETYPE_BY_ID, ASSET_TYPES, type AssetType } from "@/content";
import { ASSET_LABEL } from "@/lib/assets";
import { getPlanContext } from "@/lib/plan-context";
import { AssetCard, type AssetRow } from "./asset-card";

// §12.2 — Online Assets. Declared, never discovered. Fixed card order = ConnectedAsset.type enum.
// This page makes NO outbound network requests (§21.6).

const CREATE_TASK: Partial<Record<AssetType, string>> = { website: "3.5", gbp: "4.1", facebook: "6.2", instagram: "6.2" };

export default async function AssetsPage() {
  const ctx = await getPlanContext();
  const archetype = ARCHETYPE_BY_ID[ctx.business.trade];
  const rows: AssetRow[] = ctx.assets.map((a) => ({
    id: a.id, type: a.type, url: a.url, label: a.label, connectionState: a.connectionState, verifiedAt: a.verifiedAt?.toISOString() ?? null,
  }));

  const relevance = (t: AssetType): "relevant" | "probably_not" => {
    if (t === "facebook") return archetype.socialPlatforms.includes("facebook") ? "relevant" : "probably_not";
    if (t === "instagram") return archetype.socialPlatforms.includes("instagram") ? "relevant" : "probably_not";
    if (t === "booking" || t === "other") return "probably_not";
    return "relevant";
  };

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-500"><Link href="/your-business" className="tap inline-flex items-center underline">← Your Business</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Your online assets</h1>
        <p className="mt-1 text-[15px] text-ink-700">Tell us where your business lives online. We'll keep an eye on these.</p>
      </header>

      {ASSET_TYPES.map((t) => (
        <AssetCard
          key={t}
          type={t}
          label={ASSET_LABEL[t]}
          assets={rows.filter((r) => r.type === t)}
          createTaskId={CREATE_TASK[t]}
          relevance={relevance(t)}
          allowMany={t === "other"}
        />
      ))}
    </div>
  );
}
