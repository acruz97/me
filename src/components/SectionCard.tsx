// eslint-disable-next-line no-unused-vars
import React from 'react';
import PropTypes from 'prop-types';

const SectionCard = ({ title, children }) => {
  return (
    <section className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_50px_rgba(15,23,42,0.08)] backdrop-blur transition-colors duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-black/60 dark:text-white dark:shadow-[0_20px_80px_rgba(0,0,0,0.45)] dark:hover:bg-zinc-900">
      <div className="mb-4">
        {typeof title === 'string' ? (
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
        ) : (
          title
        )}
      </div>
      {children}
    </section>
  );
};

SectionCard.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};

export default SectionCard;

