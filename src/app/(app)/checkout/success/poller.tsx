"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkEntitlement } from "@/app/(app)/unlock/actions";

export function SuccessPoller({ destination }: { destination: string }) {
  const router = useRouter();
  const [state, setState] = useState<"waiting" | "timeout">("waiting");
  const started = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const e = await checkEntitlement();
      if (e === "launch") {
        router.replace(destination);
        router.refresh();
        return;
      }
      if (Date.now() - started.current > 60_000) return setState("timeout");
      setTimeout(tick, 2000);
    };
    void tick();
    return () => { cancelled = true; };
  }, [destination, router]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      {state === "waiting" ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Confirming your payment…</h1>
          <p className="text-ink-500">This usually takes a few seconds.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight">This is taking longer than usual.</h1>
          <p className="text-ink-700">Your payment went through — refresh in a minute, or contact us and we'll sort it out.</p>
          <button type="button" onClick={() => { started.current = Date.now(); setState("waiting"); router.refresh(); }} className="tap mt-2 h-12 rounded-xl border border-ink-300 bg-white px-5 font-semibold">Check again</button>
        </>
      )}
    </div>
  );
}
