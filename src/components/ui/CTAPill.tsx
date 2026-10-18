import React from "react";

type Props = {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  glow?: boolean;
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
};

export function CTAPill({ children, variant = "primary", glow = false, href, type = "button", onClick, className }: Props) {
  const variantClass = variant === "primary" ? "rs-cta-primary" : "rs-cta-ghost";
  const glowClass = glow ? "rs-cta-glow" : "";
  const full = ["rs-cta", variantClass, glowClass, className ?? ""].filter(Boolean).join(" ");
  if (href) {
    return (
      <a href={href} className={full}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={full}>
      {children}
    </button>
  );
}
