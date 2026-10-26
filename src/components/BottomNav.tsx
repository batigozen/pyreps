import { NavLink } from "react-router";
import Icon from "./Icon.tsx";
import { TABS } from "../navigation.ts";

export default function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="bottom-nav fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface"
    >
      <ul className="mx-auto grid max-w-[640px] grid-cols-5">
        {TABS.map((tab) => (
          <li key={tab.path}>
            <NavLink
              to={tab.path}
              end={tab.path === "/"}
              className={({ isActive }) =>
                [
                  "relative flex h-[var(--nav-h)] flex-col items-center justify-center gap-0.5 text-[13px] leading-tight",
                  isActive ? "font-bold text-accent" : "text-muted",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 h-[3px] w-10 rounded-b-full bg-accent"
                    />
                  )}
                  <Icon name={tab.icon} />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
