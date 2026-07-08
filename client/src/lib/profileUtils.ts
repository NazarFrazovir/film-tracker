export function getProfileInitials(name: string | null | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("uk-UA", {
    month: "long",
    year: "numeric",
  });
}

export function formatMemberDuration(dateStr: string): string {
  const start = new Date(dateStr);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  if (months < 1) return "менше місяця";
  if (months === 1) return "1 місяць";
  if (months >= 2 && months <= 4) return `${months} місяці`;
  if (months < 12) return `${months} місяців`;

  const years = Math.floor(months / 12);
  if (years === 1) return "1 рік";
  if (years >= 2 && years <= 4) return `${years} роки`;
  return `${years} років`;
}