"use client";

import type { ComponentProps } from "react";
import { CalendarGrid } from "@/components/calendar-grid";
import styles from "./calendar-grid-contained.module.css";

export function CalendarGridContained(props: ComponentProps<typeof CalendarGrid>) {
  return (
    <div className={styles.guard}>
      <CalendarGrid {...props} />
    </div>
  );
}
