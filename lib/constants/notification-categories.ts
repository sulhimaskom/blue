export type NotificationCategory = {
  id: "critical" | "important" | "informational";
  name: string;
  description: string;
  color: string;
};

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  { id: "critical", name: "Critical", description: "System alerts and urgent notifications", color: "red" },
  { id: "important", name: "Important", description: "Business-critical updates", color: "orange" },
  { id: "informational", name: "Informational", description: "General updates and announcements", color: "blue" },
] as const;
