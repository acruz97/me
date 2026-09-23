export type SkillGroup = {
  name: string;
  items: string[];
};

export const skills: SkillGroup[] = [
  {
    name: 'Frontend',
    items: [
      'React',
      'TypeScript',
      'JavaScript',
      'HyperText Markup Language (HTML)',
      'Cascading Style Sheets (CSS)',
      'Storybook',
      'Data-Driven Documents (D3)',
      'Microfrontends',
      'Eclipse Standard Widget Toolkit (SWT)',
    ],
  },
  {
    name: 'Backend',
    items: ['Java', 'Spring Boot', 'Node.js', 'Representational State Transfer (REST) Application Programming Interfaces (APIs)'],
  },
  {
    name: 'Data',
    items: ['Structured Query Language (SQL)', 'PostgreSQL', 'MySQL'],
  },
  {
    name: 'Testing',
    items: [
      'Jest',
      'Playwright',
      'Cucumber',
      'Gherkin',
      'Squish',
      'Test-Driven Development (TDD)',
      'Behavior-Driven Development (BDD)',
    ],
  },
  {
    name: 'DevOps & Cloud',
    items: [
      'Continuous Integration and Continuous Delivery (CI/CD)',
      'Jenkins',
      'Kubernetes',
      'Amazon Web Services (AWS)',
      'Pivotal Cloud Foundry (PCF)',
      'OpenShift Container Platform (OCP)',
      'Git',
      'GitHub',
      'Bash',
      'PowerShell',
      'Python',
      'Groovy',
    ],
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
