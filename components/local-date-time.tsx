"use client";

export function LocalDateTime({ value }: { value: string }) {
  return (
    <span suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value))}
    </span>
  );
}
