import GameForm from '@/components/admin/GameForm';

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameForm mode="edit" gameId={id} />;
}
