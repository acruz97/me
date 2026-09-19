import type { Entry } from '../components/ListItem';

export const experience: Entry[] = [
  {
    title: 'Software Engineer',
    subtitle: 'Capital One / Discover Financial Services',
    period: 'Jul 2020 – Oct 2026',
    current: true,
    bullets: [
      "Build and maintain customer-facing web applications for Discover Card and internal platforms for Discover Bank's Student Loans, Personal Loans, and Deposits businesses using React, TypeScript, and Spring Boot.",
      'Streamline payments and transactions workflows, improving operational efficiency and reducing production defects.',
      "Resolve critical issues affecting call center agents' ability to service customers by phone, and ship new features across React microfrontends, Spring services, and SQL databases.",
      'Create developer tooling that speeds up teams: automated test suites, a shared component library, and a CLI generator.',
      'Automate deployment pipelines, moving from on-prem Jenkins to Jenkins on Kubernetes in AWS, and monitor production with Datadog and Glassbox.',
    ],
  },
  {
    title: 'Campus Innovator (Intern)',
    subtitle: 'Discover Financial Services',
    period: 'Jan 2019 – May 2020',
    bullets: [
      'Built Spring Boot APIs and customer-facing web applications, including the Discover Spend Analyzer, that continues to serve customers at scale.',
    ],
  },
];
