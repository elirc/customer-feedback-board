export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "Planned" || value === "In Progress" || value === "Shipped"
      ? "green"
      : value === "Under Review"
        ? "gold"
        : value === "Declined" || value === "Duplicate"
          ? "red"
          : "blue";

  return <span className={`badge ${tone}`}>{value}</span>;
}
