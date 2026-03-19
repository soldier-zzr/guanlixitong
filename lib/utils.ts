import clsx, { type ClassValue } from "clsx";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "未记录";
  }

  return format(new Date(value), "yyyy-MM-dd HH:mm");
}

export function formatDateOnly(value?: string | Date | null) {
  if (!value) {
    return "未记录";
  }

  return format(new Date(value), "yyyy-MM-dd");
}

export function formatUserOptionLabel(user: {
  name: string;
  title?: string | null;
  managerName?: string | null;
}) {
  return user.name;
}
