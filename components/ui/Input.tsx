import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, suffix, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-haru-text">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={cn(
              "min-h-[44px] w-full rounded-2xl border border-haru-border bg-haru-surface py-3 text-base text-haru-text outline-none transition-colors placeholder:text-haru-muted",
              suffix ? "pl-4 pr-11" : "px-4",
              "focus:border-haru-primary focus:ring-2 focus:ring-haru-primary-soft",
              error && "border-haru-danger focus:border-haru-danger focus:ring-red-100",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-haru-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
