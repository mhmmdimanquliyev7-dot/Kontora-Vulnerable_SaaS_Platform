import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 text-sm font-bold text-primary-foreground shadow-sm inset-ring-1 inset-ring-white/20 dark:to-violet-500">
        K
      </span>
      <span className="font-heading text-base tracking-tight">Kontora</span>
    </div>
  );
}
