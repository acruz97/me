import React from 'react';
import './index.css';
import ListItem from './components/ListItem';
import { workExperience } from './assets/workExperience';
import { projects } from './assets/projects';

function App() {
  return (
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
            Chicago-based Software Engineer with over four years of specialized experience in the financial services sector. Demonstrated expertise in managing and resolving business-critical incidents and mitigating risks, ensuring operational continuity. Proficient in both maintaining legacy codebases and developing modern web applications, leveraging the latest technologies and adhering to industry best practices to deliver robust, scalable solutions.
          </p>
        </div>
      </header>
      <main className="space-y-8 m-4">
        <h2 className="text-xl font-semibold">Work</h2>
        <ul className="space-y-4">
          {workExperience.map((item, index) => <ListItem item={item} index={index} />)}
        </ul>
        <h2 className="text-xl font-semibold">Projects</h2>
        <ul className="space-y-4">
          {projects.map((item, index) => <ListItem item={item} index={index} />)}
        </ul>
      </main>
    </div>
  );
}

export default App;