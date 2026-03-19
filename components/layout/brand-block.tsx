"use client";

import { cn } from "@/lib/utils";

export function BrandBlock(props: {
  compact?: boolean;
  dark?: boolean;
  stacked?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  logoSrc?: string;
}) {
  const eyebrow = props.eyebrow ?? "";
  const title = props.title ?? "珠峰学员管理系统";
  const description =
    props.description ?? "聚焦线索承接、报课转化、退款审批与净 ROI 管理。";
  const logoSrc = props.logoSrc ?? "/branding/zhufeng-logo.png";

  return (
    <div
      className={cn(
        props.stacked ? "flex flex-col items-start gap-4" : "flex items-start gap-4",
        props.compact ? "gap-3" : "gap-4"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-3xl border p-3",
          props.stacked ? "w-full px-4 py-4" : "",
          props.dark
            ? "border-white/10 bg-white/5"
            : "border-slate-200 bg-white shadow-sm"
        )}
      >
        <img
          alt="珠峰学员管理系统 Logo"
          className={cn("h-auto", props.stacked ? "w-[132px]" : "w-[122px]")}
          src={logoSrc}
          width={1299}
          height={430}
        />
      </div>
      <div>
        {eyebrow ? (
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.24em]",
              props.dark ? "text-brand-200" : "text-brand-700"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-semibold tracking-tight whitespace-nowrap",
            eyebrow ? "mt-3" : "mt-0",
            props.stacked ? "text-[1.8rem] leading-none" : "text-2xl",
            props.dark ? "text-white" : "text-slate-950"
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "mt-3 max-w-[28rem] text-sm leading-7",
            props.dark ? "text-slate-300" : "text-slate-500"
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
