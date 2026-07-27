import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  titleFontFamily?: string;
}

export default function PageHeader({ title, description, titleFontFamily }: PageHeaderProps) {
  return (
    <div className="w-full relative overflow-hidden h-[100px] md:h-[165px] px-4 mb-6 md:mb-8 bg-[#111111] dark:bg-[#111111] flex items-center justify-center">
      {/* Background Texture Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-80 pointer-events-none" 
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.4%22/%3E%3C/svg%3E")',
          backgroundSize: '150px 150px'
        }}
      />
      
      {/* Container with pseudo-borders */}
      <div className="relative z-10 w-full max-w-5xl mx-auto text-center p-8">
        


        {/* Content */}
        <h1 
          className="text-3xl md:text-5xl lg:text-[56px] text-white mt-1 md:mt-2 mb-2 md:mb-4 uppercase drop-shadow-md"
          style={{ fontFamily: titleFontFamily || "'Rubik', sans-serif", fontWeight: 900, letterSpacing: '2px', lineHeight: 1 }}
        >
          {title}
        </h1>
        
        {description && (
          <p className="text-gray-300 text-sm md:text-[15px] font-medium max-w-2xl mx-auto drop-shadow-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
