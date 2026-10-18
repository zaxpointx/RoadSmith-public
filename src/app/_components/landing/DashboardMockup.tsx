/**
 * DashboardMockup — static, deterministic mockup of the School Admin Overview.
 * No fake numbers. Generic labels only. Window chrome (traffic-light dots,
 * URL bar "roadsmith.app/school-admin") so the user reads it as a product
 * preview, not a live screenshot.
 */
export function DashboardMockup() {
  return (
    <div className="rl-mockup-wrap">
      <div className="rl-mockup" role="img" aria-label="Preview of the Roadsmith school admin dashboard">
        <div className="rl-mockup-bar">
          <span className="rl-dot r" aria-hidden="true" />
          <span className="rl-dot y" aria-hidden="true" />
          <span className="rl-dot g" aria-hidden="true" />
          <span className="rl-mockup-url">roadsmith.app/school-admin</span>
          <span style={{ width: 38 }} aria-hidden="true" />
        </div>

        <div className="rl-mockup-body">
          <aside className="rl-mockup-side" aria-hidden="true">
            <div className="rl-mockup-side-title">Main</div>
            <div className="rl-mockup-side-item active">
              <span className="rl-mockup-side-swatch" />
              Overview
            </div>
            <div className="rl-mockup-side-item">Sessions</div>
            <div className="rl-mockup-side-item">Students</div>
            <div className="rl-mockup-side-item">Instructors</div>
          </aside>

          <div className="rl-mockup-main">
            <div className="rl-mockup-head">
              <h4>Overview</h4>
              <span className="rl-mockup-live">
                <span className="rl-mockup-live-dot" aria-hidden="true" />
                Live
              </span>
            </div>

            <div className="rl-kpi-grid">
              <div className="rl-kpi">
                <div className="rl-kpi-label">Active Students</div>
                <div className="rl-kpi-value">—</div>
                <div className="rl-kpi-foot">No fake numbers</div>
              </div>
              <div className="rl-kpi">
                <div className="rl-kpi-label">This Week</div>
                <div className="rl-kpi-value">—</div>
                <div className="rl-kpi-foot">No fake numbers</div>
              </div>
              <div className="rl-kpi">
                <div className="rl-kpi-label">MTD</div>
                <div className="rl-kpi-value">—</div>
                <div className="rl-kpi-foot">No fake numbers</div>
              </div>
            </div>

            <div className="rl-mockup-row">
              <span className="rl-mockup-row-label">Today &middot; Sessions</span>
              <span className="rl-mockup-row-meta">Mar 14 &middot; Knoxville, TN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
