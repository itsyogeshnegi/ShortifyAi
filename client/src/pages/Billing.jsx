export default function Billing() {
  const plans = [
    { name: 'Starter', price: 'Free', detail: 'For testing the local workflow', allowance: '10 videos / month' },
    { name: 'Creator', price: '$19', detail: 'For consistent solo publishing', allowance: '100 videos / month' },
    { name: 'Studio', price: '$38', detail: 'For high-volume content teams', allowance: 'Unlimited projects' }
  ];
  return (
    <div className="page-stack">
      <header className="page-heading">
        <div><p className="eyebrow">Plan and usage</p><h1>Billing</h1><p>Compare workspace limits and manage your plan.</p></div>
      </header>
      <div className="notice-bar">Payments are not connected. Plan changes are currently disabled.</div>
      <section className="plans-grid">
        {plans.map((plan, index) => (
          <article key={plan.name} className={`plan-card${index === 0 ? ' is-current' : ''}`}>
            <div><span className="plan-name">{plan.name}</span>{index === 0 && <span className="current-plan">Current</span>}</div>
            <p className="plan-price">{plan.price}{index > 0 && <small>/ month</small>}</p>
            <p className="plan-detail">{plan.detail}</p>
            <div className="plan-allowance">{plan.allowance}</div>
            <button className="btn-muted" disabled>{index === 0 ? 'Current plan' : 'Unavailable'}</button>
          </article>
        ))}
      </section>
    </div>
  );
}
