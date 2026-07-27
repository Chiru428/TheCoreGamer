import React from 'react';

export default function TripleChevron({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m3 18 5-5-5-5"/>
      <path d="m10 18 5-5-5-5"/>
      <path d="m17 18 5-5-5-5"/>
    </svg>
  );
}
