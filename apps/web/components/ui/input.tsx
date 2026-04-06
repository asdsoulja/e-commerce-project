import { InputHTMLAttributes } from "react";
import clsx from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25",
        className
      )}
      {...props}
    />
  );
}
