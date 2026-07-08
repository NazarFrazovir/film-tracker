import { getProfileInitials } from "../lib/profileUtils";

interface ProfileAvatarProps {
  name: string | null | undefined;
  email: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "profile-avatar--sm",
  md: "profile-avatar--md",
  lg: "profile-avatar--lg",
};

export function ProfileAvatar({ name, email, size = "md" }: ProfileAvatarProps) {
  const initials = getProfileInitials(name, email);

  return (
    <div className={`profile-avatar ${SIZE_CLASS[size]}`} aria-hidden>
      {initials}
    </div>
  );
}