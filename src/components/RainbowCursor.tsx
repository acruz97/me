import React, { useEffect, useState } from 'react';

const RainbowCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, rgba(255,0,0,0.3) 0%, rgba(255,165,0,0.3) 20%, rgba(255,255,0,0.3) 40%, rgba(0,255,0,0.3) 60%, rgba(0,0,255,0.3) 80%, rgba(238,130,238,0.3) 100%)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        transform: 'translate(-90px, -100px)',
        mixBlendMode: 'screen'
      }}
    />
  );
};

export default RainbowCursor; 