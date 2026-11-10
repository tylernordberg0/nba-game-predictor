import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Animate rows to their new place when the order changes (FLIP: measure,
 * re-render, then play each row from where it was to where it is now).
 * Only transform is animated, so it stays on the compositor. With reduced
 * motion the rows simply appear in their new order.
 */
export function useFlip(container: RefObject<HTMLElement | null>, order: string): void {
  const tops = useRef(new Map<string, number>());
  const lastOrder = useRef(order);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-flip]"));
    const next = new Map(rows.map((el) => [el.dataset.flip!, el.getBoundingClientRect().top + window.scrollY]));
    const reordered = lastOrder.current !== order;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reordered && !reduce) {
      for (const el of rows) {
        const before = tops.current.get(el.dataset.flip!);
        const after = next.get(el.dataset.flip!);
        if (before == null || after == null || Math.abs(before - after) < 1) continue;
        el.animate([{ transform: `translateY(${before - after}px)` }, { transform: "translateY(0)" }], {
          duration: 280,
          easing: "cubic-bezier(0.77, 0, 0.175, 1)",
        });
      }
    }
    tops.current = next;
    lastOrder.current = order;
  });
}
