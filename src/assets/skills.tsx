export type SkillGroup = {
  name: string;
  items: string[];
};

export const skills: SkillGroup[] = [
  {
    name: 'Frontend',
    items: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Storybook', 'D3', 'Microfrontends', 'Eclipse SWT'],
  },
  {
    name: 'Backend',
    items: ['Java', 'Spring Boot', 'Node.js', 'REST APIs'],
  },
  {
    name: 'Data',
    items: ['SQL', 'PostgreSQL', 'MySQL'],
  },
  {
    name: 'Testing',
    items: ['Jest', 'Playwright', 'Cucumber', 'Gherkin', 'Squish', 'TDD', 'BDD'],
  },
  {
    name: 'DevOps & Cloud',
    items: ['Jenkins', 'Kubernetes', 'AWS', 'PCF', 'OCP', 'Git', 'GitHub', 'Bash', 'PowerShell', 'Python', 'Groovy'],
  },
  {
    name: 'Observability',
    items: ['Datadog', 'Instana', 'AppDynamics', 'Elasticsearch', 'Glassbox'],
  },
  {
    name: 'Practices',
    items: ['Agile', 'Scrum', 'Kanban'],
  },
];
