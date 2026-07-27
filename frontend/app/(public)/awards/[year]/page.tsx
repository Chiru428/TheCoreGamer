import React from 'react';
import { notFound } from 'next/navigation';
import { fetchAwards } from '@/lib/api';
import { buildOgImageUrl } from '@/lib/seo';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { AwardCategoryPayload } from '@/types';

export const revalidate = 300;

export async function generateMetadata(
  props: { params: Promise<{ year: string }> }
): Promise<Metadata> {
  const params = await props.params;
  const title = `Game of the Year ${params.year} Awards`;
  const ogImage = buildOgImageUrl({ title, type: 'NEWS' });
  return {
    title: `${title} | TheCoreGamer`,
    description: `Vote and view nominees for the ${params.year} TheCoreGamer Game of the Year awards.`,
    openGraph: {
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
  };
}

export default async function AwardsPage(
  props: { params: Promise<{ year: string }> }
) {
  const params = await props.params;
  const year = parseInt(params.year, 10);
  if (isNaN(year)) notFound();

  const response = await fetchAwards(year);
  if (!response.success || !response.data) {
    notFound();
  }

  const awardsCategories: AwardCategoryPayload[] = response.data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col items-center justify-center mb-12 text-center">
        <Trophy className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
          {year} Awards
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl">
          Celebrating the best games of the year. Cast your votes or see the winners!
        </p>
      </div>

      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <Link href={`/awards/${year - 1}`} className="flex items-center text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          {year - 1} Awards
        </Link>
        <Link href={`/awards/${year + 1}`} className="flex items-center text-gray-400 hover:text-white transition-colors">
          {year + 1} Awards
          <ChevronRight className="w-5 h-5 ml-1" />
        </Link>
      </div>

      {awardsCategories.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 border border-gray-800">
          <p className="text-gray-400">No awards categories have been set up for {year} yet.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {awardsCategories.map((cat) => (
            <div key={cat.award.id} className="bg-gray-900 border border-gray-800 overflow-hidden relative">
              <div className="bg-gradient-to-r from-primary/20 to-transparent p-6 border-b border-gray-800">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white uppercase">{cat.award.category}</h2>
                  {!cat.award.isVotingOpen && cat.award.winnerGame && (
                    <span className="bg-primary text-black px-3 py-1 text-sm font-bold uppercase tracking-wider">
                      Winner Announced
                    </span>
                  )}
                  {cat.award.isVotingOpen && (
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 text-sm font-bold uppercase tracking-wider">
                      Voting Open
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {cat.nominees.map((nominee) => {
                    const isWinner = cat.award.winnerGameId === nominee.gameId;
                    const voteCount = cat.voteCounts[nominee.gameId] || 0;
                    const votePercentage = cat.totalVotes > 0 ? Math.round((voteCount / cat.totalVotes) * 100) : 0;

                    return (
                      <Link 
                        href={`/games/${nominee.gameId}`} // Assuming slug is not easily available, we might need a slug in nominees list
                        key={nominee.gameId}
                        className={`group relative flex flex-col bg-gray-800 transition-all border ${isWinner ? 'border-primary ring-2 ring-primary/50' : 'border-gray-700 hover:border-gray-500'}`}
                      >
                        {isWinner && (
                          <div className="absolute top-0 left-0 right-0 bg-primary text-black text-center py-1 font-bold text-xs uppercase z-10">
                            Winner
                          </div>
                        )}
                        <div className="relative aspect-[3/4] w-full overflow-hidden">
                          {nominee.coverImageUrl ? (
                            <Image
                              src={nominee.coverImageUrl}
                              alt={nominee.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <span className="text-gray-500">No cover</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <h3 className="font-bold text-white line-clamp-2 mb-2">{nominee.title}</h3>
                          
                          {/* Voting Stats */}
                          <div className="mt-auto">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>{voteCount} votes</span>
                              <span>{votePercentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-900 overflow-hidden">
                              <div 
                                className={`h-full ${isWinner ? 'bg-primary' : 'bg-gray-600'}`}
                                style={{ width: `${votePercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {cat.award.isVotingOpen && (
                  <div className="mt-8 text-center">
                    <button className="bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-wider py-3 px-8 transition-colors">
                      Vote Now
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Log in to cast your vote</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
