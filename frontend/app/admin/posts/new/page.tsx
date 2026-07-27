import PostForm from '@/components/admin/PostForm';

export default async function NewPostPage(props: { searchParams: Promise<{ type?: string; prefill?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <PostForm
      mode="create"
      type={searchParams.type || 'NEWS'}
      initialData={searchParams.prefill ? { title: searchParams.prefill } : undefined}
    />
  );
}
