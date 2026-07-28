import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-bg transition-colors duration-300 flex items-center justify-center overflow-hidden font-sans">
      {/* Background SVG Tech Lines (Angular 45-deg) */}
      {/* NOTE: SVG path `d` and `transform` attributes do NOT support CSS calc().
          Use a viewBox-based coordinate system instead for responsive positioning. */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 dark:opacity-30 opacity-60">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" preserveAspectRatio="none">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Top Left */}
          <g transform="translate(60, 60)">
            <rect x="0" y="0" width="60" height="30" rx="2" className="fill-white stroke-gray-200 dark:fill-[#0a0a0a] dark:stroke-[#222]" strokeWidth="1" />
            <circle cx="15" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="15" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <path d="M 60 15 L 80 15" className="stroke-gray-300 dark:stroke-[#333]" strokeWidth="1" fill="none" />
            <rect x="78" y="13" width="4" height="4" className="fill-gray-400 dark:fill-[#666]" filter="url(#glow)" />
          </g>
          {/* Top-left connector line toward center (viewBox: 1000×800, center≈500×400) */}
          <path d="M 140 75 L 200 75 L 250 125 L 280 125 L 320 165 L 320 200" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />
          
          {/* Bottom Left */}
          <g transform="translate(60, 710)">
            <rect x="0" y="0" width="60" height="30" rx="2" className="fill-white stroke-gray-200 dark:fill-[#0a0a0a] dark:stroke-[#222]" strokeWidth="1" />
            <circle cx="15" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="15" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <path d="M 60 15 L 80 15" className="stroke-gray-300 dark:stroke-[#333]" strokeWidth="1" fill="none" />
            <rect x="78" y="13" width="4" height="4" className="fill-gray-400 dark:fill-[#666]" filter="url(#glow)" />
          </g>
          <path d="M 140 725 L 200 725 L 250 675 L 280 675 L 320 635 L 320 600" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />

          {/* Top Right */}
          <g transform="translate(880, 60)">
            <rect x="0" y="0" width="60" height="30" rx="2" className="fill-white stroke-gray-200 dark:fill-[#0a0a0a] dark:stroke-[#222]" strokeWidth="1" />
            <circle cx="15" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="15" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <path d="M 0 15 L -20 15" className="stroke-gray-300 dark:stroke-[#333]" strokeWidth="1" fill="none" />
            <rect x="-22" y="13" width="4" height="4" className="fill-gray-400 dark:fill-[#666]" filter="url(#glow)" />
          </g>
          <path d="M 860 75 L 800 75 L 750 125 L 720 125 L 680 165 L 680 200" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />

          {/* Bottom Right */}
          <g transform="translate(880, 710)">
            <rect x="0" y="0" width="60" height="30" rx="2" className="fill-white stroke-gray-200 dark:fill-[#0a0a0a] dark:stroke-[#222]" strokeWidth="1" />
            <circle cx="15" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="10" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="15" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="30" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <circle cx="45" cy="20" r="1" className="fill-gray-300 dark:fill-[#444]" />
            <path d="M 0 15 L -20 15" className="stroke-gray-300 dark:stroke-[#333]" strokeWidth="1" fill="none" />
            <rect x="-22" y="13" width="4" height="4" className="fill-gray-400 dark:fill-[#666]" filter="url(#glow)" />
          </g>
          <path d="M 860 725 L 800 725 L 750 675 L 720 675 L 680 635 L 680 600" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[480px] px-4">
        {/* Card content (login or register page) */}
        {children}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-[11px] text-[#555] dark:text-[#555] hover:text-[#888] dark:hover:text-[#888] transition-colors flex items-center justify-center gap-1 uppercase tracking-wider">
            <span aria-hidden="true">←</span> Back to TheCoreGamer
          </Link>
        </div>
      </div>
    </div>
  );
}
