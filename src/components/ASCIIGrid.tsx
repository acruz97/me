import React, { useEffect, useRef } from 'react';

const ASCIIGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const cellSize = 120;
    const cols = Math.ceil(canvas.width / cellSize);
    const rows = Math.ceil(canvas.height / cellSize);

    // ASCII art patterns for X and O
    const asciiX = [
      '1     1',
      ' 1   1 ',
      '  1 1  ',
      '   1   ',
      '  1 1  ',
      ' 1   1 ',
      '1     1'
    ];

    const asciiO = [
      '  000  ',
      ' 0   0 ',
      '0     0',
      '0     0',
      '0     0',
      ' 0   0 ',
      '  000  '
    ];

    interface Cell {
      char: 'X' | 'O';
      rotationY: number;
    }

    interface Column {
      cells: Cell[];
      rotationPhase: number;
      rotationSpeed: number;
      isRotating: boolean;
      lastRotationTime: number;
    }

    const columns: Column[] = [];
    for (let x = 0; x < cols; x++) {
      const cells: Cell[] = [];
      for (let y = 0; y < rows; y++) {
        cells.push({
          char: Math.random() > 0.5 ? 'X' : 'O',
          rotationY: 0
        });
      }
      columns.push({
        cells,
        rotationPhase: 0,
        rotationSpeed: 0.015 + Math.random() * 0.01,
        isRotating: false,
        lastRotationTime: -10000 // Start with ability to rotate immediately
      });
    }

    const getColors = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return {
        background: isDark ? '#242424' : '#ffffff',
        text: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(33, 53, 71, 0.2)'
      };
    };

    const drawASCIIChar = (
      pattern: string[],
      centerX: number,
      centerY: number,
      rotationY: number
    ) => {
      const charSize = cellSize / 12;
      const lineHeight = cellSize / 8;
      const startY = centerY - (pattern.length * lineHeight) / 2;

      ctx.font = `${charSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      pattern.forEach((line, lineIndex) => {
        const y = startY + lineIndex * lineHeight;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === ' ') continue;

          // Calculate x position relative to center
          const relX = (i - line.length / 2) * (cellSize / 8);

          // Apply 3D perspective transformation
          const scale = Math.cos(rotationY);
          const x = centerX + relX * scale;

          // Adjust opacity based on rotation (back facing = more transparent)
          const baseOpacity = scale > 0 ? 0.2 : 0.05;
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${baseOpacity + Math.abs(scale) * 0.15})`
            : `rgba(33, 53, 71, ${baseOpacity + Math.abs(scale) * 0.15})`;

          ctx.fillText(char, x, y);
        }
      });
    };

    const draw = () => {
      const colors = getColors();
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let x = 0; x < cols; x++) {
        const column = columns[x];
        for (let y = 0; y < rows; y++) {
          const cell = column.cells[y];
          const centerX = x * cellSize + cellSize / 2;
          const centerY = y * cellSize + cellSize / 2;

          const pattern = cell.char === 'X' ? asciiX : asciiO;

          drawASCIIChar(pattern, centerX, centerY, cell.rotationY);
        }
      }
    };

    const animate = () => {
      const currentTime = Date.now();
      const rotatingColumns = columns.filter(col => col.isRotating).length;

      // Randomly start rotating columns if below max
      if (rotatingColumns < 3) {
        for (let x = 0; x < cols; x++) {
          const column = columns[x];
          const timeSinceLastRotation = currentTime - column.lastRotationTime;

          // Can only rotate if not currently rotating, at least 10 seconds have passed, and random chance
          if (!column.isRotating &&
              timeSinceLastRotation > 10000 &&
              Math.random() < 0.001) { // Low probability each frame
            column.isRotating = true;
            column.rotationPhase = 0;
            break; // Only start one column per frame
          }
        }
      }

      // Update rotating columns
      for (let x = 0; x < cols; x++) {
        const column = columns[x];

        if (column.isRotating) {
          column.rotationPhase += column.rotationSpeed;

          // Stop rotating after one full rotation
          if (column.rotationPhase >= Math.PI * 2) {
            column.isRotating = false;
            column.rotationPhase = 0;
            column.lastRotationTime = currentTime;
          }
        }

        // Update all cells in the column
        for (let y = 0; y < rows; y++) {
          column.cells[y].rotationY = column.rotationPhase;
        }
      }

      draw();
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
};

export default ASCIIGrid;
