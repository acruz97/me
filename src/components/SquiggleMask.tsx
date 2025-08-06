import React from 'react';

const GRID_SVG = `
  <svg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'>
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
`;

const SquiggleMask: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 40,
        WebkitMaskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(GRID_SVG)}")`,
        WebkitMaskRepeat: 'repeat',
        WebkitMaskSize: '40px 40px',
        maskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(GRID_SVG)}")`,
        maskRepeat: 'repeat',
        maskSize: '40px 40px',
      }}
    >
      {children}
    </div>
  );
};

export default SquiggleMask; 