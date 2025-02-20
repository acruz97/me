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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*' + 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*' +
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' + // Hiragana
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +  // Katakana
    '日月火水木金土愛心星空雨雪風花鳥魚龍虎川山海光闇';  // Common Kanji

  const points: Point[] = [];
  const radius = 250;
  const totalLat = 25;
  const totalLon = 35;
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
    p5.textSize(24);
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
    p5.background(isDarkMode ? 30 : 255);
    const rotationAngle = p5.frameCount * 0.002;
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
      p5.fill(150, isDarkMode ? 3 : 10);
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