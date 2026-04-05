import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// This utility composes Tailwind-friendly class names.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
