import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-ink-700 active:bg-ink-900",
  secondary: "bg-honey-400 text-ink-900 hover:bg-honey-500 active:bg-honey-600",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100",
  danger: "bg-danger-500 text-white hover:opacity-90",
};
const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-5 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});
