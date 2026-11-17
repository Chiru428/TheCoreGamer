import Image from 'next/image';

const copy = {
  opinions: {
    title: 'New perspectives. Next level.',
    description: 'Fresh takes on the games that stay with you. Coming soon.',
    accent: 'text-[#b91c50] dark:text-[#fb7198]',
  },
  deals: {
    title: 'Great loot. Coming soon.',
    description: 'Your next great gaming find is still in the vault.',
    accent: 'text-[#0e7490] dark:text-[#67e8f9]',
  },
};

export default function GamingComingSoon({ section }: { section: keyof typeof copy }) {
  const { title, description, accent } = copy[section];

  return (
    <section aria-labelledby={`${section}-coming-soon`} className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-2 pb-12 text-center md:pt-4 md:pb-16">
      <Image
        src="/images/empty-states/controller-coming-soon.png"
        alt=""
        width={1280}
        height={1280}
        sizes="(max-width: 767px) 200px, 260px"
        className="mb-5 h-auto w-[200px] select-none md:w-[260px]"
      />
      <p className={`mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] ${accent}`}>
        <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
        Coming soon
        <span aria-hidden="true" className="h-px w-6 bg-current opacity-40" />
      </p>
      <h2 id={`${section}-coming-soon`} className="text-2xl font-black leading-tight tracking-tight text-text-primary md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-muted md:text-base">
        {description}
      </p>
    </section>
  );
}
