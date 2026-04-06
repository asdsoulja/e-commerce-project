export default function HomePage() {
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Computer Accessories Store Starter Is Ready</h2>
      <p className="text-sm leading-6 text-slate-700">
        This repo is scaffolded to follow the EECS 4413 project format while targeting a computer
        accessories e-store (mice, keyboards, gamepads, headsets, and cables).
      </p>

      <div className="rounded-xl border border-dashed border-border p-4 text-sm">
        <p className="font-semibold">Seed credentials</p>
        <p>Admin: admin@estore.local / Admin123!</p>
        <p>Customer: customer@estore.local / Customer123!</p>
      </div>
    </section>
  );
}
