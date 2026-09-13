"use client";

import { useActionState, useState } from "react";
import type { AssetType } from "@/content";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { declareAssetAction, removeAssetAction, type AssetActionState } from "./actions";

export interface AssetRow {
  id: string;
  type: AssetType;
  url: string;
  label: string | null;
  connectionState: "declared" | "owner_verified" | "connected";
  verifiedAt: string | null;
}

const STATE_BADGE: Record<AssetRow["connectionState"], string> = {
  declared: "Saved",
  owner_verified: "Confirmed by you",
  connected: "Connected", // reserved; unreachable in V1
};

export function AssetCard({
  type,
  label,
  assets,
  createTaskId,
  relevance,
  allowMany,
}: {
  type: AssetType;
  label: string;
  assets: AssetRow[];
  createTaskId?: string;
  relevance: "relevant" | "probably_not";
  allowMany: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState<AssetActionState, FormData>(declareAssetAction, undefined);
  const showForm = adding || (assets.length === 0 && relevance === "relevant" && !createTaskId);

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{label}</h2>
        {(allowMany || assets.length === 0) && !showForm && (
          <button type="button" onClick={() => setAdding(true)} className="h-11 px-2 text-sm font-medium underline">
            {assets.length === 0 ? "Add" : "Add another"}
          </button>
        )}
      </div>

      {assets.length === 0 && !showForm && (
        <p className="mt-1 text-sm text-ink-500">
          {relevance === "probably_not" ? "Probably not needed for your kind of work." : "Not set up yet."}
          {createTaskId && (
            <>
              {" "}
              <a href={`/t/${createTaskId}`} className="underline">Set it up</a>
            </>
          )}
        </p>
      )}

      <ul className="mt-2 divide-y divide-ink-100">
        {assets.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              {a.label && <div className="text-xs text-ink-500">{a.label}</div>}
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[15px] font-medium underline">{a.url.replace(/^https?:\/\//, "")}</a>
              <div className="mt-0.5 text-xs text-ink-500">
                {STATE_BADGE[a.connectionState]}
                {a.verifiedAt && ` · ${new Date(a.verifiedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {!allowMany && (
                <button type="button" onClick={() => setAdding(true)} className="h-11 px-2 text-sm text-ink-700 underline">Edit</button>
              )}
              <form action={removeAssetAction.bind(null, a.id)}>
                <button type="submit" className="h-11 px-2 text-sm text-ink-500 underline">Remove</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {showForm && (
        <form action={action} className="mt-3 space-y-2" onSubmit={() => setAdding(false)}>
          <input type="hidden" name="type" value={type} />
          {type === "other" && (
            <div>
              <Label htmlFor={`label-${type}`}>What is it?</Label>
              <Input id={`label-${type}`} name="label" placeholder="e.g. Nextdoor, Yelp" />
            </div>
          )}
          <div>
            <Label htmlFor={`url-${type}`}>{assets.length && !allowMany ? "Replace the link" : "Link"}</Label>
            <Input id={`url-${type}`} name="url" type="url" inputMode="url" placeholder="https://" defaultValue={!allowMany ? assets[0]?.url ?? "" : ""} required />
            <p className="mt-1 text-xs text-ink-500">Paste it exactly. We never guess or look it up.</p>
            <FieldError>{state?.error}</FieldError>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            <button type="button" onClick={() => setAdding(false)} className="h-11 px-3 text-sm text-ink-500 underline">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
