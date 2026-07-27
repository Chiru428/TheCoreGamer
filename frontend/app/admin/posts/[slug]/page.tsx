import { redirect } from 'next/navigation';

export default async function PostSlugRedirect(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  redirect(`/admin/posts/${params.slug}/edit`);
}
