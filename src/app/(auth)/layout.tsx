export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-2">
        <span aria-hidden className="text-2xl">🐝</span>
        <span className="text-lg font-bold tracking-tight">gobeefound</span>
      </div>
      {children}
    </main>
  );
}
