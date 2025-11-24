import React from 'react';

type SectionCardProps = {
  title: string;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-black/50 dark:text-white dark:shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  );
};

export default SectionCard;

