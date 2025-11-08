
import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:opacity-90",
  { variants: { size: { default: "h-10 px-4 py-2", sm: "h-9 px-3", lg: "h-11 px-8" } }, defaultVariants: { size: "default" } }
)
export function Button({ className, size, ...props }) { return <button className={cn(buttonVariants({ size, className }))} {...props} /> }
