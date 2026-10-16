/** Original RoduCQ artwork. A process map, not a completion/status chart. */
export function WorkflowArt() {
  const stages = ["Intake", "Brief", "Proposal", "Plan", "Update"];
  return (
    <div className="workflow-map">
    <svg className="workflow-art" viewBox="0 0 720 146" role="img" aria-label="Intake to Brief to Proposal to Plan to Update. Each stage requires your review and action.">
      <path className="workflow-connector" d="M72 62H648" fill="none" stroke="currentColor" strokeWidth="2" pathLength="1" />
      {stages.map((label, i) => (
        <g key={label} transform={`translate(${18 + i * 144} 28)`}>
          <rect className="workflow-node" width="108" height="68" rx="20" />
          <path d="M30 25h48M30 38h36M30 51h42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {i < 4 && <path d="M119 29l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />}
        </g>
      ))}
      <circle className="workflow-pulse" cx="72" cy="62" r="5" fill="currentColor" />
    </svg>
    {/* Native text stays 12px on phones; SVG text would shrink to 4px. */}
    <ol className="workflow-labels" aria-hidden="true">{stages.map((stage) => <li key={stage}>{stage}</li>)}</ol>
    </div>
  );
}

export function IntakeGuide() {
  return (
    <section className="intake-guide" aria-labelledby="intake-guide-title">
      <p className="forma-kicker">From context to clarity</p>
      <h2 id="intake-guide-title">Good work starts with a clear brief.</h2>
      <svg viewBox="0 0 320 150" role="img" aria-label="Client notes organized into a structured brief">
        <g className="guide-paper" transform="rotate(-8 78 76)"><rect x="20" y="22" width="112" height="110" rx="16" /><path d="M40 48h60M40 62h70M40 76h45M40 99h57" /></g>
        <path className="workflow-connector" d="M140 76h35m-7-7 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" pathLength="1" />
        <g className="guide-paper"><rect x="190" y="10" width="110" height="130" rx="16" /><path d="M210 36h58M210 57h12m10 0h45M210 79h12m10 0h45M210 101h12m10 0h35" /></g>
      </svg>
      <ol className="guide-steps">
        <li><span>01</span><div><h3>Bring the context</h3><p>Paste a message or upload your source file.</p></div></li>
        <li><span>02</span><div><h3>Review the draft</h3><p>Check objectives, deliverables and open questions.</p></div></li>
        <li><span>03</span><div><h3>Make it yours</h3><p>Edit the details, then save your brief.</p></div></li>
      </ol>
      <p className="mt-5 text-xs text-muted-foreground">You stay in control. Review generated content before using it.</p>
    </section>
  );
}
