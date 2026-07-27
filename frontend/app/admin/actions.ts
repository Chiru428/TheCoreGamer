'use server';

import { revalidatePath } from 'next/cache';

export async function revalidatePublicPages(slug?: string, contentType?: string) {
  revalidatePath('/');
  revalidatePath('/articles');
  revalidatePath('/reviews');
  revalidatePath('/mod-guides');

  if (slug) {
    if (contentType === 'REVIEW') {
      revalidatePath(`/reviews/${slug}`);
    } else if (contentType === 'MOD_GUIDE') {
      revalidatePath(`/mod-guides/${slug}`);
    } else {
      revalidatePath(`/articles/${slug}`);
    }
  }
}

export async function revalidateGamePage(slug?: string) {
  revalidatePath('/games');
  if (slug) {
    revalidatePath(`/games/${slug}`);
    revalidatePath(`/games/${slug}`, 'page');
    revalidatePath(`/games/${slug}`, 'layout');
  }
}
