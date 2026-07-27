import { redirect } from 'next/navigation';

export default async function ReviewSlugRedirect(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  redirect(`/admin/reviews/${params.slug}/edit`);
}
