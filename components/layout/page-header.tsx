import { ReactNode } from "react";

export function PageHeader(props: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          {props.eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {props.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {props.description}
        </p>
      </div>
      {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
    </div>
  );
}
