import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "rounded-md border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        {
          "border-accent bg-accent text-white hover:brightness-95": variant === "primary",
          "border-border bg-white text-text hover:bg-slate-100": variant === "secondary",
          "border-red-300 bg-red-50 text-red-700 hover:bg-red-100": variant === "danger"
        },
        className
      )}
      {...props}
    />
  );
}
