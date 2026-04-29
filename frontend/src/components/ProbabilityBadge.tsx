import type { ProbColor } from "../types";

interface Props {
  score: number;
  color: ProbColor;
  size?: "sm" | "md" | "lg";
}

const COLOR_CLASSES: Record<ProbColor, string> = {
  green: "border-emerald-200 bg-[linear-gradient(180deg,_rgba(236,253,245,0.98),_rgba(220,252,231,0.92))] text-emerald-800",
  yellow: "border-amber-200 bg-[linear-gradient(180deg,_rgba(255,251,235,0.98),_rgba(254,243,199,0.92))] text-amber-800",
  red: "border-rose-200 bg-[linear-gradient(180deg,_rgba(255,241,242,0.98),_rgba(254,226,226,0.92))] text-rose-800",
};

const LABEL: Record<ProbColor, string> = {
  green: "Available",
  yellow: "Limited",
  red: "Full",
};

const SIZE_CLASSES = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3 py-1.5 text-xs",
  lg: "px-4 py-2 text-sm",
};

export default function ProbabilityBadge({ score, color, size = "md" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-[0.01em] ${COLOR_CLASSES[color]} ${SIZE_CLASSES[size]}`}
      aria-label={`Parking availability: ${LABEL[color]}, ${Math.round(score * 100)}%`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          color === "green" ? "bg-emerald-500" : color === "yellow" ? "bg-amber-500" : "bg-rose-500"
        }`}
        aria-hidden="true"
      />
      {LABEL[color]} · {Math.round(score * 100)}%
    </span>
  );
}
