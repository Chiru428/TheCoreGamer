import GenericArticlePage, { generateMetadata } from '@/components/blog/GenericArticlePage';

export { generateMetadata };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <GenericArticlePage params={params} expectedPath="guides" />;
}
