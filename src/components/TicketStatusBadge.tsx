import type { TicketStatusCategory } from "../../shared/types";

interface TicketStatusBadgeProps {
  statusName?: string;
  statusCategory?: TicketStatusCategory;
  className?: string;
}

export const TicketStatusBadge = ({
  statusName,
  statusCategory = "unknown",
  className
}: TicketStatusBadgeProps) => {
  const label = statusName?.trim() || "Unknown";

  return (
    <span
      className={`ticket-status-badge is-${statusCategory}${className ? ` ${className}` : ""}`}
      title={`Jira status: ${label}`}
    >
      <span className="ticket-status-badge-text">{label}</span>
    </span>
  );
};
