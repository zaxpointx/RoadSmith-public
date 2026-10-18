import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Footer — wordmark, copyright, single column of links.
 * Standalone component used by MarketingLayout; exposed separately in case a page wants
 * a different footer arrangement.
 */
export function Footer() {
  return (
    <footer className="rs-footer">
      <div className="rs-footer-inner">
        <Logo href="/" size="sm" />
        <div className="rs-footer-links">
          <Link href="/pricing" className="rs-nav-link">Pricing</Link>
          <Link href="/login" className="rs-nav-link">Sign in</Link>
          <Link href="/legal/terms" className="rs-nav-link">Terms</Link>
          <Link href="/legal/privacy" className="rs-nav-link">Privacy</Link>
        </div>
        <span className="rs-footer-copy">© 2026 Roadsmith</span>
      </div>
    </footer>
  );
}