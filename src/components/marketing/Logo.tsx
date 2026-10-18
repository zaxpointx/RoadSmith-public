import Link from "next/link";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Marketing Logo — "ROAD" white + "SMITH" gradient (violet → blue → lime).
 * Uses .rs-logo-road / .rs-logo-smith utility classes defined in globals.css.
 * Lives in src/components/marketing/ so the marketing surface has a clear home.
 */
export function Logo({ href = "/", size = "md", className = "" }: Props) {
  const sizeClass =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";
  const content = (
    <span
      className={`inline-flex items-center gap-2 font-extrabold tracking-[-0.04em] ${sizeClass} ${className}`}
      aria-label="Roadsmith"
    >
      <span className="rs-logo-road">ROAD</span>
      <span className="rs-logo-smith">SMITH</span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} className="no-underline">
      {content}
    </Link>
  );
}