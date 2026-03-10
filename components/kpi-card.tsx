import { ReactNode } from "react";

export function KpiCard(props: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={
        props.tone === "dark"
          ? "panel-dark px-5 py-5"
          : "panel px-5 py-5"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={
              props.tone === "dark"
                ? "text-xs font-semibold uppercase tracking-[0.22em] text-brand-200"
                : "text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
            }
          >
            {props.label}
          </p>
          <div
            className={
              props.tone === "dark"
                ? "mt-4 text-3xl font-semibold tracking-tight text-white"
                : "mt-4 text-3xl font-semibold tracking-tight text-slate-950"
            }
          >
            {props.value}
          </div>
          {props.hint ? (
            <p
              className={
                props.tone === "dark"
                  ? "mt-3 text-sm text-slate-300"
                  : "mt-3 text-sm text-slate-500"
              }
            >
              {props.hint}
            </p>
          ) : null}
        </div>
        {props.icon ? (
          <div
            className={
              props.tone === "dark"
                ? "rounded-2xl bg-white/10 p-3 text-brand-200"
                : "rounded-2xl bg-brand-50 p-3 text-brand-700"
            }
          >
            {props.icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
