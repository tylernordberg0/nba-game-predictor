import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export type Route = "today" | "bet-checker" | "results";

const PATHS: Record<Route, string> = { today: "/", "bet-checker": "/bet-checker", results: "/results" };

function parse(pathname: string): Route {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/bet-checker") return "bet-checker";
  if (p === "/results") return "results";
  return "today";
}

export function href(route: Route, query?: Record<string, string>): string {
  const q = query ? `?${new URLSearchParams(query)}` : "";
  return PATHS[route] + q;
}

export function navigate(to: string): void {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function useRoute(): { route: Route; search: URLSearchParams } {
  const [loc, setLoc] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const on = () => setLoc(window.location.pathname + window.location.search);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  const url = new URL(loc, window.location.origin);
  return { route: parse(url.pathname), search: url.searchParams };
}

/** An ordinary link that swaps pages without a reload. Modified clicks still open a new tab. */
export function Link(props: { to: string; className?: string; children: ReactNode; "aria-current"?: "page" }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(props.to);
  };
  return (
    <a href={props.to} className={props.className} aria-current={props["aria-current"]} onClick={onClick}>
      {props.children}
    </a>
  );
}
