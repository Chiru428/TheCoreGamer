'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, useReducedMotion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Facebook, Instagram, MessageCircle, Twitch, Twitter, Youtube, BookOpen, Globe, ExternalLink, ShoppingCart, Gamepad2, Star } from 'lucide-react';
import GameTrailerModal from '@/components/games/GameTrailerModal';
import { getAlgoliaUserToken, sendAlgoliaEvent } from '@/lib/algolia';
import { trackClarityEvent } from '@/lib/clarity';
import { formatDate } from '@/lib/utils';
import { fetchGameRatings } from '@/lib/api';
import type { GameHubData, GamePriceEntry, GameWebsiteLinks } from '@/types';
import styles from './gamehub.module.css';

const MAIN_STORE_KEYWORDS = ['steam', 'epic', 'microsoft', 'xbox'];

function isMainStore(shop: string): boolean {
  const lower = shop.toLowerCase();
  return MAIN_STORE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

interface GameHeroProps {
  game: GameHubData;
  slug: string;
  trailerUrl: string | null;
  youtubeId: string | null;
  youtubeSearchUrl: string;
}

export default function GameHero({ game, slug, trailerUrl, youtubeId, youtubeSearchUrl }: GameHeroProps) {
  const { data: session } = useSession();
  const shouldReduceMotion = useReducedMotion();

  // Check if the current user has already submitted a rating for this game
  const { data: ratingsRes } = useSWR(
    session?.user?.id ? `game-ratings-${slug}-helpful-1` : null,
    () => fetchGameRatings(slug, 1, 'helpful')
  );
  const hasUserRated = !!ratingsRes?.data?.aggregate?.userRating;

  const releaseDateText = game.releaseDate ? formatDate(game.releaseDate) : 'TBA';
  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;

  const displayReleaseStatus = (() => {
    if (!game.releaseDate) {
      return 'Coming Soon';
    }
    const rd = new Date(game.releaseDate);
    if (rd.getTime() > Date.now()) {
      return 'Coming Soon';
    }
    if (rd.getTime() <= Date.now() && game.releaseStatus === 'Coming Soon') {
      return 'Released';
    }
    return game.releaseStatus;
  })();

  const allPrices = game.priceData ?? [];
  const mainStorePrices = allPrices.filter((p) => isMainStore(p.shop));
  const otherPrices = allPrices.filter((p) => !isMainStore(p.shop));
  const prices = [...mainStorePrices, ...otherPrices].slice(0, 3);

  const mainPlatform = game.platforms && game.platforms.length > 0 ? game.platforms[0] : 'Unknown';

  return (
    <section className="relative w-full flex flex-col mt-[-90px]">

      {/* Backdrop Image — desktop only */}
      <div className="relative w-full h-[300px] sm:h-[400px] overflow-hidden hidden md:block">
        {(game.backgroundImageUrl || game.coverImageUrl) && (
          <div
            className="absolute inset-0 bg-cover bg-top"
            style={{ backgroundImage: `url(${game.backgroundImageUrl || game.coverImageUrl})` }}
            aria-hidden
          />
        )}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Blue Info Bar */}
      <div className="w-full bg-[#2453A4] text-white relative z-10">
        {/* Subtle fade at the top inner edge of the blue bar — desktop only */}
        <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none hidden md:block" />

        {/* -- MOBILE layout --------------------------------------------- */}
        <div className="md:hidden pt-[100px] pb-6 flex flex-col">
          {/* Large Cover Art — centered at top */}
          <div className="flex justify-center px-6">
            <div className="w-[300px] bg-[#1c3e8a] p-2 border-2 border-white/40 shadow-xl">
              <div className="w-full aspect-[2/3] relative overflow-hidden">
                {game.coverImageUrl ? (
                  <Image
                    src={game.coverImageUrl}
                    alt={`${game.title} cover art`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="300px"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg3 text-text text-3xl font-bold">
                    {game.title.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details below cover */}
          <div className="px-4 mt-5 flex flex-col gap-3">
            {/* Title */}
            <h1 className="text-[30px] font-black font-display leading-tight break-words text-center" title={game.title}>
              {game.title}
            </h1>

            {/* Metadata rows — grid layout for aligned values */}
            <div className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-2 text-[16px] text-white/70 w-[330px] mx-auto">
              {displayReleaseStatus && <><span>Status:</span> <strong className="text-white font-bold">{displayReleaseStatus}</strong></>}
              {releaseDateText && <><span>Release Date:</span> <strong className="text-white font-bold">{releaseDateText}</strong></>}
              {game.platforms && game.platforms.length > 0 && <><span>System:</span> <strong className="text-white font-bold">{game.platforms.join(', ')}</strong></>}
              {game.publisher && <><span>Publisher:</span> <strong className="text-white font-bold">{game.publisher}</strong></>}
              {game.developer && <><span>Developer:</span> <strong className="text-white font-bold">{game.developer}</strong></>}
            </div>

            {/* Rating Box — same styling as desktop */}
            <div className="bg-[#183973] py-4 px-6 flex items-center gap-6 shadow-sm justify-between mt-1 w-[330px] mx-auto">
              <div className="flex flex-col gap-1.5">
                <span className="text-[20px] font-bold text-white mb-1">Game Rating</span>
                <span className="text-[16px] text-white/80">Our Review: <strong className="text-white">{game.GameReview?.[0]?.reviewScore ? `${game.GameReview[0].reviewScore}/10` : 'N/A'}</strong></span>
                <span className="text-[16px] text-white/80">User Ratings: <strong className="text-white">{game.userRatings?.average ? `${game.userRatings.average.toFixed(1)}/10` : 'N/A'} <span className="text-xs font-normal">({game.userRatings?.count ?? 0})</span></strong></span>
                <Link href="?tab=reviews" scroll={false} className="mt-3 bg-[#2453A4] hover:bg-[#1c4282] text-white text-[16px] font-bold py-2 px-4 transition-colors w-fit shadow-md text-center">
                  {hasUserRated ? 'Edit Your Review' : 'Write a Review'}
                </Link>
              </div>
              <div className="w-20 h-20 relative flex items-center justify-center shrink-0">
                <Star className="w-full h-full text-white fill-white absolute drop-shadow-md" />
                <span className="z-10 font-bold text-[#183973] text-2xl mt-1">{game.GameReview?.[0]?.reviewScore || game.userRatings?.average?.toFixed(1) || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* -- DESKTOP layout -------------------------------------------- */}
        <div className="max-w-[1280px] mx-auto pr-4 lg:pr-8 relative min-h-[140px] hidden md:flex md:flex-row md:items-center justify-between pb-4 pt-4 pl-4 md:pl-[280px] lg:pl-[300px]">

          {/* Absolute Cover Art (Breaks out of the blue bar upwards) */}
          <div className="absolute bottom-[-50px] left-4 lg:left-8 w-[260px] bg-[#2453A4] p-3 pb-[50px] z-20">
            <div className="w-full aspect-[2/3] relative border-4 border-white bg-bg3 overflow-hidden">
              {game.coverImageUrl ? (
                <Image
                  src={game.coverImageUrl}
                  alt={`${game.title} cover art`}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="260px"
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg3 text-text text-4xl font-bold">
                  {game.title.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Left Metadata (Title, System, etc) */}
          <div className="flex flex-col gap-2 z-10 py-4 flex-1 min-w-0 pr-4 md:pr-8">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-[40px] font-black font-display leading-tight line-clamp-2 break-words max-w-[450px] md:max-w-[560px]" style={{ textWrap: 'balance' }} title={game.title}>{game.title}</h1>
            </div>
            
            <div className="flex flex-col gap-2 text-[16px] text-white/70">
              {(displayReleaseStatus || releaseDateText) && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  {displayReleaseStatus && <span className="inline-flex gap-2"><span>Status:</span> <strong className="text-white">{displayReleaseStatus}</strong></span>}
                  {releaseDateText && <span className="inline-flex gap-2"><span>Release Date:</span> <strong className="text-white">{releaseDateText}</strong></span>}
                </div>
              )}
              {game.platforms && game.platforms.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <span className="inline-flex gap-2"><span>System:</span> <strong className="text-white">{game.platforms.join(', ')}</strong></span>
                </div>
              )}
              {(game.publisher || game.developer) && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  {game.publisher && <span className="inline-flex gap-2"><span>Publisher:</span> <strong className="text-white">{game.publisher}</strong></span>}
                  {game.developer && <span className="inline-flex gap-2"><span>Developer:</span> <strong className="text-white">{game.developer}</strong></span>}
                </div>
              )}
            </div>
          </div>

          {/* Right Ratings */}
          <div className="flex flex-col items-end gap-4 relative z-10">
            <div className="bg-[#183973] py-3 px-6 md:py-4 md:px-8 flex items-center gap-10 shadow-sm min-w-[280px] justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-[20px] font-bold text-white mb-1">Game Rating</span>
                <span className="text-[16px] text-white/80">Our Review: <strong className="text-white">{game.GameReview?.[0]?.reviewScore ? `${game.GameReview[0].reviewScore}/10` : 'N/A'}</strong></span>
                <span className="text-[16px] text-white/80">User Ratings: <strong className="text-white">{game.userRatings?.average ? `${game.userRatings.average.toFixed(1)}/10` : 'N/A'} <span className="text-xs font-normal">({game.userRatings?.count ?? 0})</span></strong></span>
                <Link href="?tab=reviews" scroll={false} className="mt-3 bg-[#2453A4] hover:bg-[#1c4282] text-white text-[16px] font-bold py-2 px-4 transition-colors w-fit shadow-md text-center">
                  {hasUserRated ? 'Edit Your Review' : 'Write a Review'}
                </Link>
              </div>
              <div className="w-20 h-20 relative flex items-center justify-center shrink-0">
                <Star className="w-full h-full text-white fill-white absolute drop-shadow-md" />
                <span className="z-10 font-bold text-[#183973] text-2xl mt-1">{game.GameReview?.[0]?.reviewScore || game.userRatings?.average?.toFixed(1) || '-'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
