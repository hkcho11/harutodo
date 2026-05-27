import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-haru-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "min-h-[44px] w-full rounded-2xl border border-haru-border bg-haru-surface px-4 py-3 text-base text-haru-text outline-none transition-colors placeholder:text-haru-muted",
            "focus:border-haru-primary focus:ring-2 focus:ring-haru-primary-soft",
            error &&
              "border-haru-danger focus:border-haru-danger focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-haru-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
