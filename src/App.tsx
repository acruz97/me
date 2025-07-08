import React from 'react';
import './index.css';
import ListItem from './components/ListItem';
import { experience } from './assets/experience';
import { projects } from './assets/projects';
import { skills } from './assets/skills';
import ASCIISphere from './components/ASCIISphere'
import RainbowCursor from './components/RainbowCursor';
import SquiggleMask from './components/SquiggleMask';

function App() {
  return (
    <>
      <SquiggleMask>
        <RainbowCursor />
      </SquiggleMask>
      {/* <div className="absolute inset-0 flex ">
        <ASCIISphere />
      </div> */}
      <div className="flex min-h-[100dvh]">
        <div className="container mx-auto p-4">
          <header className="flex justify-between items-center m-4">
            <div>
              <h1 className="text-2xl font-bold mb-4">
                <a
                  href="https://www.linkedin.com/in/angelo-cruz-is-a-dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  Angelo Cruz
                </a>
              </h1>
              <p className="text-sm">
              Chicago-based Software Engineer with 4+ years in financial services, delivering robust web applications for Discover Card & Bank. I specialize in building scalable solutions, resolving critical incidents, and modernizing legacy systems using React and Spring Boot in Agile environments. Explore my work to see how I drive efficiency and innovation through collaborative, iterative development.
              </p>
            </div>
          </header>
          <main className="space-y-8 m-4">
            <h2 className="text-xl font-semibold">Work</h2>
            <ul className="space-y-4">
              {experience.map((item, index) => <ListItem item={item} index={index} />)}
            </ul>
            <h2 className="text-xl font-semibold">Skills</h2>
            <ul className="space-y-4">
              {skills.map((item, index) => <ListItem item={item} index={index} />)}
            </ul>
            <h2 className="text-xl font-semibold">Projects</h2>
            <ul className="space-y-4">
              {projects.map((item, index) => <ListItem item={item} index={index} />)}
            </ul>
          </main>
        </div>
      </div>
    </>
  );
}

export default App;