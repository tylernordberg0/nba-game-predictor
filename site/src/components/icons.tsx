// One small icon set: 16px grid, 2px strokes, round caps.
const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const CheckIcon = () => (
  <svg {...base}><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>
);
export const CrossIcon = () => (
  <svg {...base}><path d="M4 4l8 8M12 4l-8 8" /></svg>
);
export const ChevronIcon = () => (
  <svg {...base}><path d="M4 6l4 4 4-4" /></svg>
);
export const AlertIcon = () => (
  <svg {...base}><path d="M8 2.5l6 10.5H2L8 2.5z" /><path d="M8 6.5v3M8 11.4v.1" /></svg>
);
export const ArrowIcon = () => (
  <svg {...base}><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);
