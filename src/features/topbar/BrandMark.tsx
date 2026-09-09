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
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
  >
    {title ? <title>{title}</title> : null}
    <path d="M24 3.5 41.75 13.75v20.5L24 44.5 6.25 34.25v-20.5L24 3.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="m24 11.25 11.05 6.38v12.74L24 36.75l-11.05-6.38V17.63L24 11.25Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" opacity=".72" />
    <path d="M14.2 24h19.6M24 13.7v20.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="24" cy="24" r="2.2" fill="currentColor" />
  </svg>
);
