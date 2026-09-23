import { useEffect, useRef } from 'react';
import { createSnowflakeBackground, type SnowflakeVariant } from '../lib/snowflakeBackground';

type Props = {
  /** 'emblem' (bold, ornate, symmetrical) or 'dendrite' (natural branching crystal). */
  variant?: SnowflakeVariant;
};

/** Fixed, full-viewport WebGL2 snowflake animation that sits behind the page. */
const SnowflakeBackground = ({ variant = 'emblem' }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return createSnowflakeBackground(ref.current, { variant });
  }, [variant]);

  return <canvas ref={ref} className="neural-bg" aria-hidden="true" />;
};

export default SnowflakeBackground;
