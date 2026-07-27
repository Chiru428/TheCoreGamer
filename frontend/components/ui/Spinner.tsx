import React from 'react';

export function Spinner({ className = 'w-5 h-5', size, style }: { className?: string, size?: number, style?: React.CSSProperties }) {
  // If `size` is provided, we can pass it as inline style or attributes
  // but Tailwind `w-` `h-` classes in `className` will override them if present.
  const svgStyle: React.CSSProperties = {
    animationTimingFunction: 'cubic-bezier(0.5, 0, 0.5, 1)',
    ...style,
  };

  if (size) {
    svgStyle.width = size;
    svgStyle.height = size;
  }

  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={svgStyle}
    >
      <circle cx="12" cy="12" r="10" stroke="var(--accent-dim)" strokeWidth="3" />
      <path
        d="M 12 2 A 10 10 0 0 1 22 12"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
