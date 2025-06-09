import React, { useEffect, useRef } from 'react';

const RainbowCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX - 100}px`;
        cursorRef.current.style.top = `${e.clientY - 100}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed z-50"
      style={{
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, rgba(147,51,234,0.3) 0%, rgba(59,130,246,0.3) 100%)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        mixBlendMode: 'screen'
      }}
    />
  );
};

export default RainbowCursor; 