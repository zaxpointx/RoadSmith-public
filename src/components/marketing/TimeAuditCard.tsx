type Row = {
  label: string;
  hours: string;
};

const ROWS: Row[] = [
  { label: "Parent SMS", hours: "12 hrs/wk" },
  { label: "Reschedules", hours: "5 hrs/wk" },
  { label: "Payment follow-up", hours: "4 hrs/wk" },
];

/**
 * TimeAuditCard — three-row monospace stat block for process section 01.
 * Pairs with ProcessSection. Dark surface, lime trend footer.
 */
export function TimeAuditCard() {
  return (
    <div className="operator-time-audit" aria-label="Time leak audit example">
      <ul className="operator-time-audit-rows">
        {ROWS.map((row) => (
          <li className="operator-time-audit-row" key={row.label}>
            <span className="operator-time-audit-label">{row.label}</span>
            <span className="operator-time-audit-hours">{row.hours}</span>
          </li>
        ))}
      </ul>
      <p className="operator-time-audit-trend">
        Roadsmith cuts these to <b>~2 hrs/wk combined</b>
      </p>
    </div>
  );
}
