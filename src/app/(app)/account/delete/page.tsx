import Link from "next/link";
import { requireBusiness } from "@/lib/current-user";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { deleteAccount } from "./actions";

// §20.6 — warn → offer export → require typing the business name → hard delete.

export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { profile } = await requireBusiness();
  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500"><Link href="/account" className="tap inline-flex items-center underline">← Account</Link></nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Delete your account</h1>
        <p className="mt-2 text-[15px] text-ink-700">
          This permanently removes your account, your business record, your online asset links, your generated drafts, and your logo. <strong>It cannot be undone.</strong>
        </p>
      </header>

      <div className="rounded-2xl border border-honey-100 bg-honey-50 p-4">
        <p className="text-[15px] font-medium">Take your data with you first.</p>
        <p className="mt-1 text-sm text-ink-700">Everything you entered is yours. Download it before you go — it's free and always will be.</p>
        <a href="/your-business/export/json" className="tap mt-3 inline-flex h-11 items-center rounded-lg border border-ink-300 bg-white px-4 text-sm font-semibold">Download my data</a>
      </div>

      <form action={deleteAccount} className="space-y-4 rounded-2xl border border-danger-500/30 bg-white p-4">
        <div>
          <Label htmlFor="confirm">Type your business name to confirm: <span className="font-semibold text-ink-900">{profile.displayName}</span></Label>
          <Input id="confirm" name="confirm" autoComplete="off" required />
          {error === "mismatch" && <p role="alert" className="mt-1.5 text-sm text-danger-500">That didn't match. Type it exactly as shown.</p>}
        </div>
        <Button type="submit" variant="danger" fullWidth>Delete my account permanently</Button>
      </form>
    </div>
  );
}
