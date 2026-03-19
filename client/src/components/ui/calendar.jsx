import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-white p-1.5", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "space-y-2",
        caption: "flex items-center justify-center pt-1 relative",
        caption_label: "text-[0.95rem] font-semibold tracking-tight text-slate-900",
        nav: "absolute inset-x-1 top-1 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-8 rounded-lg text-slate-700 hover:bg-slate-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-8 rounded-lg text-slate-700 hover:bg-slate-100"
        ),
        month_caption: "relative flex items-center justify-center h-9 px-10",
        table: "w-full table-fixed border-collapse",
        weekdays: "mb-0.5",
        weekday:
          "w-[14.2857%] rounded-md py-0.5 text-[0.72rem] font-semibold tracking-wide uppercase text-slate-500 text-center",
        week: "mt-0.5",
        day: "w-[14.2857%] p-0.5 text-center text-sm align-middle relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-full rounded-md p-0 text-[0.92rem] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 aria-selected:opacity-100"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "ring-1 ring-slate-300 bg-slate-100 text-slate-900",
        outside: "text-slate-300 opacity-75",
        disabled: "text-slate-300 opacity-60",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
