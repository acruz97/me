import React from 'react';

const SQUIGGLE_SVG = `
  <svg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
    <path d='M0,100 Q50,50 100,100 T200,100' stroke='white' fill='none' stroke-width='1'/>
    <path d='M0,60 Q50,10 100,60 T200,60' stroke='white' fill='none' stroke-width='1'/>
    <path d='M0,140 Q50,90 100,140 T200,140' stroke='white' fill='none' stroke-width='1'/>
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
        WebkitMaskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(SQUIGGLE_SVG)}")`,
        WebkitMaskRepeat: 'repeat',
        WebkitMaskSize: '200px 200px',
        maskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(SQUIGGLE_SVG)}")`,
        maskRepeat: 'repeat',
        maskSize: '200px 200px',
      }}
    >
      {children}
    </div>
  );
};

export default SquiggleMask; 