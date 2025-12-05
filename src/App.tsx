// eslint-disable-next-line no-unused-vars
import React from 'react';
import './index.css';
import ListItem from './components/ListItem';
import SectionCard from './components/SectionCard';
import { experience } from './assets/experience';
import { projects } from './assets/projects';
import { skills } from './assets/skills';

function App() {
  return (
    <div className="relative min-h-screen bg-white text-slate-900 transition-colors duration-300 dark:bg-[#050505] dark:text-white">
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <SectionCard
          title={
            <h2 className="text-4xl ">
              <a
                href="https://www.linkedin.com/in/angelo-cruz-is-a-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-900 transition hover:text-blue-500 dark:text-white dark:hover:text-blue-400"
              >
                Angelo Cruz
              </a>
            </h2>
          }
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">
            Chicago, IL · Software Engineer
          </p>
          <p className="text-sm text-slate-600 dark:text-white/70">
            I am a Chicago-based Software Engineer with over 5 years of experience in the financial services industry. I deliver robust web applications for Discover Card & Bank, specializing in building scalable solutions, resolving critical incidents, and modernizing legacy systems using React and Spring Boot in agile environments.
          </p>
        </SectionCard>

        <main className="grid gap-6">
          <SectionCard title="Work">
            <ul className="divide-y divide-white/10">
              {experience.map((item) => (
                <ListItem key={item.name} item={item} />
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Skills">
            <ul className="divide-y divide-white/10">
              {skills.map((item) => (
                <ListItem key={item.name} item={item} />
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Projects">
            <ul className="divide-y divide-white/10">
              {projects.map((item) => (
                <ListItem key={item.name} item={item} />
              ))}
            </ul>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}

export default App;