import type { ProbColor } from "../types";

interface Props {
  score: number;
  color: ProbColor;
  size?: "sm" | "md" | "lg";
}

const COLOR_CLASSES: Record<ProbColor, string> = {
  green:  "bg-green-100  text-green-800  border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  red:    "bg-red-100    text-red-800    border-red-300",
};

const LABEL: Record<ProbColor, string> = {
  green:  "Available",
  yellow: "Limited",
  red:    "Full",
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
};

export default function ProbabilityBadge({ score, color, size = "md" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium
        ${COLOR_CLASSES[color]} ${SIZE_CLASSES[size]}`}
      aria-label={`Parking availability: ${LABEL[color]}, ${Math.round(score * 100)}%`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          color === "green" ? "bg-green-500" :
          color === "yellow" ? "bg-yellow-500" : "bg-red-500"
        }`}
        aria-hidden="true"
      />
      {LABEL[color]} · {Math.round(score * 100)}%
    </span>
  );
}
