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
  wordmarkClassName,
  captionClassName,
  showCaption = false,
  compact = false,
}: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center", compact ? "gap-2" : "gap-3", className)}>
      <div className="inline-flex items-end leading-none font-black tracking-[-0.06em]">
        <span className={cn("text-[#00B5E2]", compact ? "text-xl" : "text-2xl", wordmarkClassName)}>Global</span>
        <span className={cn("text-[#FF9E1B]", compact ? "text-xl" : "text-2xl", wordmarkClassName)}>ENP</span>
      </div>
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
