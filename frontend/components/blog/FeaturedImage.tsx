import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  credit?: string | null;
  priority?: boolean;
}

export default function FeaturedImage({ src, alt, credit, priority }: Props) {
  return (
    <>
      <div className="relative left-1/2 -ml-[50vw] w-screen md:left-0 md:ml-0 md:w-full aspect-video overflow-hidden mt-0 md:mt-6 rounded-none border-0">
        <Image 
          src={src} 
          alt={alt} 
          fill 
          className="object-cover object-center" 
          priority={priority} 
          sizes="(max-width: 1024px) 100vw, 1280px" 
        />
      </div>
      {credit && (
        <p className="text-[11px] text-text-dim mt-1 mb-[6px] px-4 md:px-0">
          © {credit}
        </p>
      )}
    </>
  );
}
