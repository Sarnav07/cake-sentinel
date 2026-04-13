import { ReactNode } from 'react';

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section-card">
      <header className="section-header">
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}