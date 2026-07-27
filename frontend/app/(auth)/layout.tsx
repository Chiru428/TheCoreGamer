import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-bg transition-colors duration-300 flex items-center justify-center overflow-hidden font-sans">
      {/* Background SVG Tech Lines (Angular 45-deg) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 dark:opacity-30 opacity-60">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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
          <path d="M 140 75 L 200 75 L 250 125 L calc(50vw - 220px) 125 L calc(50vw - 180px) 165 L calc(50vw - 180px) 200" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />
          
          {/* Bottom Left */}
          <g transform="translate(60, calc(100vh - 90px))">
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
          <path d="M 140 calc(100vh - 75px) L 200 calc(100vh - 75px) L 250 calc(100vh - 125px) L calc(50vw - 220px) calc(100vh - 125px) L calc(50vw - 180px) calc(100vh - 165px) L calc(50vw - 180px) calc(100vh - 200px)" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />

          {/* Top Right */}
          <g transform="translate(calc(100vw - 120px), 60)">
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
          <path d="M calc(100vw - 140px) 75 L calc(100vw - 200px) 75 L calc(100vw - 250px) 125 L calc(50vw + 220px) 125 L calc(50vw + 180px) 165 L calc(50vw + 180px) 200" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />

          {/* Bottom Right */}
          <g transform="translate(calc(100vw - 120px), calc(100vh - 90px))">
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
          <path d="M calc(100vw - 140px) calc(100vh - 75px) L calc(100vw - 200px) calc(100vh - 75px) L calc(100vw - 250px) calc(100vh - 125px) L calc(50vw + 220px) calc(100vh - 125px) L calc(50vw + 180px) calc(100vh - 165px) L calc(50vw + 180px) calc(100vh - 200px)" className="stroke-gray-200 dark:stroke-[#222]" strokeWidth="1" fill="none" />
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
