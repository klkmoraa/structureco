interface BrandMarkProps {
  size?: number;
  title?: string;
  className?: string;
}

export const BrandMark = ({ size = 32, title, className }: BrandMarkProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
  >
    {title ? <title>{title}</title> : null}
    <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="currentColor" />
    <path
      d="M22.35 6.75h-7.7c-4.2 0-6.75 2.25-6.75 5.65 0 3.2 2.35 5.2 6.45 5.2h3.7c2.05 0 3.1.8 3.1 2.25 0 1.5-1.15 2.4-3.25 2.4H9V26h8.9c4.15 0 6.6-2.35 6.6-6.1 0-3.35-2.3-5.35-6.4-5.35h-3.7c-2.1 0-3.15-.75-3.15-2.1 0-1.25 1.15-2.05 3.35-2.05h7.75V6.75Z"
      fill="var(--brand-mark-ink, #fff)"
    />
  </svg>
);
