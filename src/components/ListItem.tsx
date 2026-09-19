export type Entry = {
  title: string;
  subtitle?: string;
  period?: string;
  current?: boolean;
  description?: string;
  bullets?: string[];
  tags?: string[];
  href?: string;
};

type ListItemProps = {
  item: Entry;
  variant?: 'row' | 'card';
};

const ListItem = ({ item, variant = 'row' }: ListItemProps) => (
  <li className={`entry entry-${variant}`}>
    <div className="entry-head">
      <h3 className="entry-title">
        {item.href ? (
          <a href={item.href} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          item.title
        )}
        {item.current && <span className="badge">Current</span>}
      </h3>
      {item.period && <span className="entry-period">{item.period}</span>}
    </div>
    {item.subtitle && <p className="entry-sub">{item.subtitle}</p>}
    {item.description && <p className="entry-desc">{item.description}</p>}
    {item.bullets && (
      <ul className="entry-bullets">
        {item.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    )}
    {item.tags && (
      <ul className="chips" aria-label="Technologies">
        {item.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    )}
  </li>
);

export default ListItem;
