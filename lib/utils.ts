import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const MATCH_THRESHOLD = 70;

export const MAX_WORK_EXPERIENCE = 3;

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
