import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  wordmarkClassName?: string;
  captionClassName?: string;
  showCaption?: boolean;
  compact?: boolean;
}

export function BrandLogo({
  className,
  captionClassName,
  showCaption = false,
  compact = false,
}: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center", compact ? "gap-2" : "gap-3", className)}>
      <img
        src="/images/globalenp-logo.png"
        alt="Global ENP"
        className={cn(compact ? "h-7" : "h-8", "w-auto object-contain")}
      />
      {showCaption ? (
        <span
          className={cn(
            "rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72",
            captionClassName,
          )}
        >
          Align
        </span>
      ) : null}
    </div>
  );
}
