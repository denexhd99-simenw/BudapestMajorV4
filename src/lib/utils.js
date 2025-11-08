import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...i){return twMerge(clsx(i))}