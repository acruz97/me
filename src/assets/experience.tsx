import type { Entry } from '../components/ListItem';

export const experience: Entry[] = [
  {
    title: 'Software Engineer',
    subtitle: 'Capital One / Discover Financial Services',
    period: 'July 2020 – October 2026',
    bullets: [
      'Built and maintained customer-facing web applications for Discover Card using React, TypeScript, and Spring Boot.',
      "Developed internal platforms for Discover Bank's Student Loans, Personal Loans, and Deposits businesses.",
      'Streamlined payment and transaction workflows, which improved operational efficiency and reduced production defects.',
      "Resolved critical issues that affected call center agents' ability to serve customers by phone.",
      'Shipped new features across React microfrontends, Spring services, and Structured Query Language (SQL) databases.',
      'Created developer tooling that sped up teams, including automated test suites, a shared component library, and a command-line interface (CLI).',
      'Automated deployment pipelines and migrated them from on-premises Jenkins to Jenkins on Kubernetes in Amazon Web Services (AWS).',
      'Monitored production health with Datadog and Glassbox.',
    ],
  },
  {
    title: 'Campus Innovator (Intern)',
    subtitle: 'Discover Financial Services',
    period: 'January 2019 – May 2020',
    bullets: [
      'Built Spring Boot application programming interfaces (APIs) and customer-facing web applications, including the Discover Spend Analyzer, which went on to serve customers at scale.',
    ],
  },
];
