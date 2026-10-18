/**
 * Footer — one line of copy, one email, one GitHub link. Nothing else.
 */
export function Footer() {
  return (
    <footer className="rl-footer">
      <div className="rl-footer-inner">
        <span>Built for owner-operators. Shipped from East Tennessee.</span>
        <span className="rl-footer-links">
          <a href="mailto:hello@roadsmith.app">hello@roadsmith.app</a>
          <a
            href="https://github.com/zaxpointx/RoadSmith-public"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}
