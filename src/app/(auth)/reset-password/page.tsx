import { ResetPasswordForm } from "./reset-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return <ResetPasswordForm step={step === "update" ? "update" : "request"} />;
}
