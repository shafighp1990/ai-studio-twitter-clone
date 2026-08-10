import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function XLogo({ size = 30, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function AIStudioLogo({ size = 38, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect width="44" height="44" rx="12" fill="currentColor" />
      <path
        d="M11 30 17.8 13h3.8l6.8 17h-4.1l-1.4-3.9h-6.5L15 30h-4Zm6.6-7.2h4.1l-2-5.7-2.1 5.7Z"
        fill="#000"
      />
      <path d="M30.2 13H34v17h-3.8V13Z" fill="#000" />
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></IconBase>
);
export const SearchIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></IconBase>
);
export const BellIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></IconBase>
);
export const MailIcon = (props: IconProps) => (
  <IconBase {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></IconBase>
);
export const BookmarkIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M6 3h12v18l-6-4-6 4V3Z" /></IconBase>
);
export const UserIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></IconBase>
);
export const MoreIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></IconBase>
);
export const ComposeIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></IconBase>
);
export const ReplyIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></IconBase>
);
export const RepostIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m17 1 4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="m7 23-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></IconBase>
);
export const HeartIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></IconBase>
);
export const ShareIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 13v7h14v-7" /></IconBase>
);
export const ImageIcon = (props: IconProps) => (
  <IconBase {...props}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></IconBase>
);
export const SmileIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></IconBase>
);
export const CalendarIcon = (props: IconProps) => (
  <IconBase {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></IconBase>
);
export const BackIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m15 18-6-6 6-6" /></IconBase>
);
export const LocationIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></IconBase>
);
export const LinkIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" /></IconBase>
);
export const CheckIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m5 12 4 4L19 6" /></IconBase>
);
export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" /></IconBase>
);
