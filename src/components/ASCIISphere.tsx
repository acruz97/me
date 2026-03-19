import { useEffect, useState } from 'react';
import Sketch from 'react-p5';
import p5Types from 'p5';

interface Point {
  pos: p5Types.Vector;
  originalPos: p5Types.Vector;
  char: string;
  velocity: p5Types.Vector;
}

const ASCIISphere: React.FC = () => {
  const chars = '•';  // Simple dot character for minimal aesthetic

  const points: Point[] = [];
  const radius = 200;
  const totalLat = 30;
  const totalLon = 40;
  let font: p5Types.Font;
  let zoom = 3; // Initialize zoom level

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Function to check if the system is in dark mode
    const checkDarkMode = () => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(false);
      }
    };

    // Check dark mode on initial render
    checkDarkMode();

    // Listen for changes in the system theme
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', checkDarkMode);

    // Clean up listener on component unmount
    return () => {
      darkModeMediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  const preload = (p5: p5Types) => {
    font = p5.loadFont('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@4.5.12/files/noto-sans-jp-all-400-normal.woff');
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, document.body.scrollHeight, p5.WEBGL).parent(canvasParentRef);
    p5.textFont(font);
    p5.textSize(16);  // Smaller dots for subtle effect
    p5.textAlign(p5.CENTER, p5.CENTER);

    for (let i = 0; i < totalLat; i++) {
      const lat = p5.map(i, 0, totalLat - 1, 0, p5.PI);
      for (let j = 0; j < totalLon; j++) {
        const lon = p5.map(j, 0, totalLon - 1, 0, p5.TWO_PI);
        const x = radius * p5.sin(lat) * p5.cos(lon);
        const z = radius * p5.sin(lat) * p5.sin(lon);
        const y = radius * p5.cos(lat);
        const char = chars[Math.floor(Math.random() * chars.length)];
        points.push({
          pos: p5.createVector(x, y, z),
          originalPos: p5.createVector(x, y, z),
          char: char,
          velocity: p5.createVector(0, 0, 0)
        });
      }
    }
  }

  const draw = (p5: p5Types) => {
    p5.clear();  // Transparent background
    const rotationAngle = p5.frameCount * 0.001;  // Slower rotation
    p5.rotateY(rotationAngle);

    p5.scale(zoom);

    points.forEach(point => {
      // No mouse interaction, just draw the characters in their original positions
      p5.push();
      p5.translate(point.originalPos.x, point.originalPos.y, point.originalPos.z);
      const rotation = p5.atan2(point.originalPos.y, point.originalPos.x);
      p5.rotateZ(rotation);
      p5.rotateY(p5.PI / 2);
      p5.rotateX(p5.PI);
      // Subtle gray dots
      p5.fill(180, 180, 180, 150);
      p5.text(point.char, 0, 0);
      p5.pop();
    });
  }

  // New function to handle window resizing
  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, document.body.scrollHeight);
  }

  return (
    <div className="ascii-sphere">
      <Sketch preload={preload} setup={setup} draw={draw} windowResized={windowResized} />
    </div>
  );
}

export default ASCIISphere;