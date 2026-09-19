import type { ReactNode } from 'react';
import ListItem from './components/ListItem';
import { profile } from './assets/profile';
import { experience } from './assets/experience';
import { projects } from './assets/projects';
import { skills } from './assets/skills';
import { education } from './assets/education';

type SectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

const Section = ({ id, title, children }: SectionProps) => (
  <section className="section" aria-labelledby={`${id}-title`}>
    <h2 className="section-title" id={`${id}-title`}>
      {title}
    </h2>
    {children}
  </section>
);

function App() {
  return (
    <div className="page">
      <header className="hero">
        <h1>{profile.name}</h1>
        <p className="role">{profile.title}</p>
        <p className="summary">{profile.summary}</p>

        <div className="links">
          {profile.links.map((link) => (
            <a
              key={link.href}
              className="link-btn"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
          <button type="button" className="link-btn no-print" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>

        <ul className="stats" aria-label="Highlights">
          {profile.stats.map((stat) => (
            <li key={stat.value}>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </li>
          ))}
        </ul>
      </header>

      <main>
        <Section id="experience" title="Experience">
          <ul className="entries">
            {experience.map((item) => (
              <ListItem key={item.title} item={item} />
            ))}
          </ul>
        </Section>

        <Section id="projects" title="Projects">
          <ul className="cards">
            {projects.map((item) => (
              <ListItem key={item.title} item={item} variant="card" />
            ))}
          </ul>
        </Section>

        <Section id="skills" title="Skills">
          <div className="skills">
            {skills.map((group) => (
              <div key={group.name} className="skill-group">
                <h3 className="skill-name">{group.name}</h3>
                <ul className="chips" aria-label={`${group.name} skills`}>
                  {group.items.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="education" title="Education">
          <ul className="entries">
            {education.map((item) => (
              <ListItem key={item.title} item={item} />
            ))}
          </ul>
        </Section>
      </main>

      <footer className="footer">
        <h2 className="section-title">About</h2>
        <p className="about">{profile.about}</p>
        <p className="copyright">
          © {new Date().getFullYear()} {profile.name}
        </p>
      </footer>
    </div>
  );
}

export default App;
