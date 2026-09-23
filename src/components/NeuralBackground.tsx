import { useEffect, useRef } from 'react';
import { createNeuralBackground } from '../lib/neuralBackground';

/** Fixed, full-viewport WebGL2 neural network animation that sits behind the page. */
const NeuralBackground = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return createNeuralBackground(ref.current);
  }, []);

  return <canvas ref={ref} className="neural-bg" aria-hidden="true" />;
};

export default NeuralBackground;
