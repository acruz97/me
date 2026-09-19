import type { Entry } from '../components/ListItem';

export const projects: Entry[] = [
  {
    title: 'Discover Spend Analyzer',
    description:
      'Interactive web app that gives Discover cardholders insight into their spending, with D3 bar and pie charts, statements, rewards, and transactions. Built for 60M+ cardholders and tuned for both mobile and desktop.',
    tags: ['React', 'D3'],
  },
  {
    title: 'Bank Customer Servicing Platform',
    description:
      "Web applications Discover Bank call center agents use to service customers by phone. Resolved critical issues affecting agents' ability to answer inquiries, simplified payment and transaction workflows, and added automation and observability.",
    tags: ['React', 'Spring', 'MySQL', 'Eclipse SWT', 'Squish'],
  },
  {
    title: 'Card Customer Servicing Platform',
    description:
      'Resolved critical agent-facing issues and delivered new features for the platform agents use to handle cardholder calls, using a microfrontend architecture.',
    tags: ['React Microfrontends', 'Spring', 'PostgreSQL'],
  },
  {
    title: 'Shared Servicing Platform',
    description:
      'Maintained and extended shared services that automate the reading of disclosures to customers during live agent calls.',
    tags: ['React', 'Spring', 'PostgreSQL'],
  },
  {
    title: 'Banking Backend Services',
    description: "Spring services powering Discover Bank's lending and deposit products.",
    tags: ['Java', 'Spring Boot'],
  },
  {
    title: 'React Component Library',
    description:
      "Reusable, Storybook-documented component library for Discover Bank's Call Center platform. Standardized UI elements, accelerated development, and improved collaboration between engineers and process owners.",
    tags: ['React', 'Storybook'],
  },
  {
    title: 'Developer Toolkit',
    description:
      "Node.js CLI that automates React app and component generation for the Call Center platform, providing standardized templates and enforcing best practices.",
    tags: ['Node.js', 'CLI'],
  },
  {
    title: 'Automated Test Suite',
    description:
      'JavaScript testing framework for desktop applications that replaced manual workflows, improving accuracy and standardizing evidence collection.',
    tags: ['JavaScript', 'Cucumber'],
  },
];
