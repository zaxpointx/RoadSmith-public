'use client'

interface AuthLayoutProps {
  children: React.ReactNode
}

export { DashboardPreview }
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      {/* Left Panel - Form */}
      <div className="auth-left">
        <div className="auth-form-container">
          {children}
        </div>
      </div>

      {/* Right Panel - Dashboard Preview */}
      <div className="auth-right">
        <DashboardPreview />
      </div>

      <style jsx>{`
        .auth-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-outer);
        }

        .auth-left {
          width: 45%;
          background: var(--bg-left);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 0;
        }

        .auth-form-container {
          width: 100%;
          max-width: 400px;
          padding: 0 40px;
          animation: fadeInUp 0.5s ease-out;
        }

        .auth-right {
          width: 55%;
          background: var(--bg-right);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Diagonal geometric bands */
        .auth-right::before,
        .auth-right::after {
          content: '';
          position: absolute;
          background: var(--auth-border);
          opacity: 0.12;
          pointer-events: none;
        }

        .auth-right::before {
          width: 200%;
          height: 1px;
          top: 20%;
          left: -50%;
          transform: rotate(-15deg);
        }

        .auth-right::after {
          width: 200%;
          height: 1px;
          bottom: 25%;
          right: -50%;
          transform: rotate(-15deg);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-8px) rotate(-6deg); }
        }

        @media (max-width: 768px) {
          .auth-shell {
            flex-direction: column;
          }

          .auth-left {
            width: 100%;
            min-height: 100vh;
            padding: 32px 0;
          }

          .auth-form-container {
            padding: 0 24px;
          }

          .auth-right {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

function DashboardPreview() {
  return (
    <div className="preview-wrapper">
      {/* Headline overlay */}
      <div className="preview-headline">
        <h2>Run your school,<br />not yourself ragged.</h2>
      </div>

      {/* Tilted mockup card */}
      <div className="preview-card" style={{ animation: 'float 6s ease-in-out infinite' }}>
        {/* Mockup header */}
        <div className="mockup-header">
          <div className="mockup-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="mockup-title">Dashboard</div>
        </div>

        {/* KPI Metrics */}
        <div className="mockup-kpis">
          <div className="kpi-card">
            <div className="kpi-label">Active Students</div>
            <div className="kpi-value">247</div>
            <div className="kpi-change positive">+12%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">This Week</div>
            <div className="kpi-value">86</div>
            <div className="kpi-change positive">+8%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Revenue</div>
            <div className="kpi-value">$4.2k</div>
            <div className="kpi-change positive">+15%</div>
          </div>
        </div>

        {/* Mini chart */}
        <div className="mockup-chart">
          <div className="chart-bars">
            <div className="bar" style={{ height: '40%' }}></div>
            <div className="bar" style={{ height: '60%' }}></div>
            <div className="bar" style={{ height: '45%' }}></div>
            <div className="bar" style={{ height: '80%' }}></div>
            <div className="bar" style={{ height: '65%' }}></div>
            <div className="bar" style={{ height: '90%' }}></div>
            <div className="bar" style={{ height: '75%' }}></div>
          </div>
        </div>
      </div>

      {/* Shadow beneath card */}
      <div className="preview-shadow"></div>

      <style jsx>{`
        .preview-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          width: 100%;
          height: 100%;
        }

        .preview-headline {
          position: absolute;
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          z-index: 10;
        }

        .preview-headline h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 42px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1.2;
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
        }

        .preview-card {
          background: var(--surface);
          border: 1px solid var(--auth-border);
          border-radius: 16px;
          padding: 24px;
          width: 380px;
          transform: rotate(-6deg);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
          z-index: 5;
        }

        .preview-shadow {
          position: absolute;
          bottom: 20%;
          width: 300px;
          height: 40px;
          background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
          transform: rotate(-6deg) translateY(30px);
          z-index: 1;
        }

        .mockup-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .mockup-dots {
          display: flex;
          gap: 6px;
        }

        .mockup-dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--auth-border);
        }

        .mockup-dots span:first-child {
          background: #e05c5c;
        }

        .mockup-dots span:nth-child(2) {
          background: #e0bf6a;
        }

        .mockup-dots span:nth-child(3) {
          background: #4ade80;
        }

        .mockup-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .mockup-kpis {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .kpi-card {
          background: var(--bg-left);
          border: 1px solid var(--auth-border);
          border-radius: 10px;
          padding: 14px;
        }

        .kpi-label {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .kpi-value {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .kpi-change {
          font-size: 11px;
          font-weight: 600;
        }

        .kpi-change.positive {
          color: var(--accent-gold);
        }

        .mockup-chart {
          background: var(--bg-left);
          border: 1px solid var(--auth-border);
          border-radius: 10px;
          padding: 16px;
          height: 80px;
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 100%;
          gap: 8px;
        }

        .bar {
          flex: 1;
          background: linear-gradient(to top, var(--accent-gold), var(--accent-gold-hover));
          border-radius: 4px 4px 0 0;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .preview-wrapper {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
