import { ReactNode } from "react";

export function SectionCard(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{props.title}</h3>
          {props.subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{props.subtitle}</p>
          ) : null}
        </div>
        {props.actions ? <div>{props.actions}</div> : null}
      </div>
      <div className="p-5">{props.children}</div>
    </section>
  );
}
