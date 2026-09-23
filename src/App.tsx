import { useEffect, type ReactNode } from 'react';
import ListItem from './components/ListItem';
import SnowflakeBackground from './components/SnowflakeBackground';
// To switch back to the neural network animation, import NeuralBackground from
// './components/NeuralBackground' and render <NeuralBackground /> below instead.
import { profile } from './assets/profile';
import { experience } from './assets/experience';
import { projects } from './assets/projects';
import { skills } from './assets/skills';
import { education } from './assets/education';

type SectionProps = {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
};

const Section = ({ id, title, className = '', children }: SectionProps) => (
  <section id={id} className={`section ${className}`} aria-labelledby={`${id}-title`}>
    <h2 className="section-title" id={`${id}-title`}>
      {title}
    </h2>
    {children}
  </section>
);

const PDF_TITLE = `${profile.name} - Resume`;

function App() {
  // Give the saved PDF a recruiter-friendly file name ("Angelo Cruz - Resume.pdf").
  useEffect(() => {
    let previous = document.title;
    const before = () => {
      previous = document.title;
      document.title = PDF_TITLE;
    };
    const after = () => {
      document.title = previous;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  return (
    <>
      {/* Snowflake look: variant="emblem" (bold, symmetrical) or variant="dendrite" (natural). */}
      <SnowflakeBackground variant="emblem" />
      <div className="page">
        <header className="hero">
          <h1>{profile.name}</h1>
          <p className="role">{profile.title}</p>

          {/* Plain-text contact line: visible on screen and parsed by ATS software on the PDF. */}
          <ul className="contact" aria-label="Contact information">
            <li>{profile.location}</li>
            <li>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </li>
            {profile.links.map((link) => (
              <li key={link.href} className="print-only">
                <a href={link.href}>{link.display}</a>
              </li>
            ))}
          </ul>

          <h2 className="section-title print-only">Summary</h2>
          <p className="summary">{profile.summary}</p>

          <div className="links no-print">
            {profile.links.map((link) => (
              <a
                key={link.href}
                className="link-btn"
                href={link.href}
                target="_blank"
                rel="me noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
            <button type="button" className="link-btn" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          </div>

          <ul className="stats no-print" aria-label="Highlights">
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

        <footer className="footer no-print">
          <h2 className="section-title">About</h2>
          <p className="about">{profile.about}</p>
          <p className="about about-note">{profile.backgroundNote}</p>
          <p className="copyright">
            © {new Date().getFullYear()} {profile.name}
          </p>
        </footer>
      </div>
    </>
  );
}

export default App;
