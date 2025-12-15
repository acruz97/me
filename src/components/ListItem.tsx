import React from 'react';

type ListItemProps = {
  item: {
    name: string;
    description?: string;
    date?: string;
    isCurrent?: boolean;
    logo?: string;
    href?: boolean;
    url?: string;
  };
};

const ListItem: React.FC<ListItemProps> = ({ item }) => {
  return (
    <li className="group flex flex-wrap gap-4 py-4">
      {item.logo && (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 dark:bg-white/5">
          {item.logo}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.href && item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-slate-900 transition hover:text-blue-500 dark:text-white dark:hover:text-blue-400"
            >
              {item.name}
            </a>
          ) : (
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {item.name}
            </span>
          )}
          {item.isCurrent && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300">
              CURRENT
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {item.description && (
            <p className="flex-1 text-sm text-slate-600 dark:text-white/70">
              {item.description}
            </p>
          )}
          {(item.date || (item.href && item.url)) && (
            <div className="flex items-center gap-3 whitespace-nowrap text-xs text-slate-500 dark:text-white/60">
              {item.date && <span>{item.date}</span>}
              {item.href && item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-500 transition hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Visit
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default ListItem;