import type { Entry } from '../components/ListItem';

export const projects: Entry[] = [
  {
    title: 'Discover Spend Analyzer',
    description:
      'Built an interactive web app that gave Discover cardholders insight into their spending through Data-Driven Documents (D3) bar and pie charts, statements, rewards, and transactions. It was designed for more than 60 million cardholders and optimized for both mobile and desktop.',
    tags: ['React', 'Data-Driven Documents (D3)'],
  },
  {
    title: 'Bank Customer Servicing Platform',
    description:
      "Developed web applications that Discover Bank call center agents used to serve customers by phone. Resolved critical issues that affected agents' ability to answer inquiries. Simplified payment and transaction workflows and added automation and observability.",
    tags: ['React', 'Spring', 'MySQL', 'Eclipse Standard Widget Toolkit (SWT)', 'Squish'],
  },
  {
    title: 'Card Customer Servicing Platform',
    description:
      'Resolved critical agent-facing issues and delivered new features for the microfrontend platform that agents used to handle cardholder calls.',
    tags: ['React Microfrontends', 'Spring', 'PostgreSQL'],
  },
  {
    title: 'Shared Servicing Platform',
    description:
      'Maintained and extended shared services that automated the reading of disclosures to customers during live agent calls.',
    tags: ['React', 'Spring', 'PostgreSQL'],
  },
  {
    title: 'Banking Backend Services',
    description: "Developed Spring services that powered Discover Bank's lending and deposit products.",
    tags: ['Java', 'Spring Boot'],
  },
  {
    title: 'React Component Library',
    description:
      "Created a reusable component library for Discover Bank's call center platform and documented it in Storybook. It standardized user interface (UI) elements, accelerated development, and improved collaboration between engineers and process owners.",
    tags: ['React', 'Storybook'],
  },
  {
    title: 'Developer Toolkit',
    description:
      'Built a Node.js command-line interface (CLI) that automated React app and component generation for the call center platform. It provided standardized templates and enforced best practices.',
    tags: ['Node.js', 'Command-Line Interface (CLI)'],
  },
  {
    title: 'Automated Test Suite',
    description:
      'Developed a JavaScript testing framework for desktop applications that replaced manual workflows. It improved accuracy and standardized evidence collection.',
    tags: ['JavaScript', 'Cucumber'],
  },
];
