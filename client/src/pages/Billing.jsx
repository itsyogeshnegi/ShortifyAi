export default function Billing() {
  return (
    <div className="grid gap-6">
      <header className="glass rounded-[2rem] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-mint">Billing UI</p>
        <h1 className="mt-3 font-display text-4xl font-bold">Plans without payment wiring</h1>
        <p className="mt-3 text-frost/60">This is a SaaS-ready pricing screen only. No paid provider is connected.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {['Starter', 'Creator', 'Studio'].map((plan, index) => (
          <article key={plan} className="glass rounded-[1.5rem] p-6">
            <h2 className="font-display text-2xl font-bold">{plan}</h2>
            <p className="mt-3 text-4xl font-bold">{index === 0 ? 'Free' : `$${index * 19}`}<span className="text-base text-frost/50">/mo</span></p>
            <p className="mt-4 text-frost/60">Local generation, private files, and creator workflow tools.</p>
            <button className="btn-muted mt-6 w-full">UI only</button>
          </article>
        ))}
      </section>
    </div>
  );
}
