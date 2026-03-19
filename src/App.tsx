import React from 'react';
import './index.css';
import ListItem from './components/ListItem';
import { experience } from './assets/experience';
import { projects } from './assets/projects';
import { skills } from './assets/skills';
import ASCIISphere from './components/ASCIISphere'

function App() {
  return (
    <>
      <div className="absolute inset-0 flex pointer-events-none opacity-30">
        <ASCIISphere />
      </div>
      <div className="flex flex-col flex-1 items-center justify-start min-h-screen py-12">
        <div className="max-w-3xl w-full px-8">
          <header className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest mb-4" style={{color: '#888'}}>
              Chicago-Based Software Engineer
            </p>
            <h1 className="text-5xl mb-8" style={{
              fontSize: '4rem',
              fontWeight: '400',
              letterSpacing: '0.15em',
              color: '#4169E1'
            }}>
              <a
                href="https://www.linkedin.com/in/angelo-cruz-is-a-dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                Angelo Cruz
              </a>
            </h1>
            <p className="text-sm leading-relaxed mx-auto" style={{maxWidth: '600px', color: '#666'}}>
              I am a Chicago-based Software Engineer with over 5 years of experience in the financial services industry, where I have been delivering robust web applications for Discover Card & Bank. I specialize in building scalable solutions, resolving critical incidents, and modernizing legacy systems using technologies like React and Spring Boot in Agile environments.
            </p>
          </header>
          <main className="space-y-16">
            <section>
              <h2 className="text-sm uppercase tracking-widest mb-6" style={{color: '#888'}}>Work</h2>
              <ul className="space-y-4">
                {experience.map((item, index) => <ListItem item={item} index={index} />)}
              </ul>
            </section>
            <section>
              <h2 className="text-sm uppercase tracking-widest mb-6" style={{color: '#888'}}>Skills</h2>
              <ul className="space-y-4">
                {skills.map((item, index) => <ListItem item={item} index={index} />)}
              </ul>
            </section>
            <section>
              <h2 className="text-sm uppercase tracking-widest mb-6" style={{color: '#888'}}>Projects</h2>
              <ul className="space-y-4">
                {projects.map((item, index) => <ListItem item={item} index={index} />)}
              </ul>
            </section>
          </main>
          <footer className="mt-16 text-center">
            <p className="text-xs" style={{color: '#999'}}>
              Powered by React + Vite using Vercel
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

export default App;