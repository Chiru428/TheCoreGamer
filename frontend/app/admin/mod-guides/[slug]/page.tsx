import { redirect } from 'next/navigation';

export default async function ModGuideSlugRedirect(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  redirect(`/admin/mod-guides/${params.slug}/edit`);
}
