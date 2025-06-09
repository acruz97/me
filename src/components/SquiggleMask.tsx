import React from 'react';

const SQUIGGLE_SVG = `
  <svg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
    <path d='M0,50 Q25,25 50,50 T100,50' stroke='white' fill='none' stroke-width='1'/>
    <path d='M0,30 Q25,5 50,30 T100,30' stroke='white' fill='none' stroke-width='1'/>
    <path d='M0,70 Q25,45 50,70 T100,70' stroke='white' fill='none' stroke-width='1'/>
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
        WebkitMaskSize: '100px 100px',
        maskImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(SQUIGGLE_SVG)}")`,
        maskRepeat: 'repeat',
        maskSize: '100px 100px',
        transform: 'translateX(0)',
        animation: 'scrollSquiggles 20s linear infinite',
      }}
    >
      {children}
      <style>
        {`
          @keyframes scrollSquiggles {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-100px);
            }
          }
        `}
      </style>
    </div>
  );
};

export default SquiggleMask; 