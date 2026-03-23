import { type FC } from 'react';

interface SystemEventProps {
  text: string;
  animDelay?: number;
}

export const SystemEvent: FC<SystemEventProps> = ({ text, animDelay }) => {
  return (
    <div
      className="narr-system"
      style={animDelay !== undefined ? { animationDelay: `${animDelay}s` } : undefined}
    >
      <span className="narr-system-content">{text}</span>
    </div>
  );
};
