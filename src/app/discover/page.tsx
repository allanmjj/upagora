'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, Filter, Star, TrendingUp, Clock, Eye, Heart,
  Ghost, ArrowRight, Sparkles, Flame, Users
} from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SoulListing = {
  id: string;
  name: string;
  preview: string;
  type: 'beloved' | 'mentor' | 'self' | 'expert';
  rating: number;
  reviews: number;
  interactions: number;
  tags: string[];
  owner: string;
  featured?: boolean;
};

const mockSouls: SoulListing[] = [
  {
    id: '1', name: 'Su Dongpo', preview: 'Chinese poet and statesman of the Song Dynasty.',
    type: 'mentor', rating: 4.9, reviews: 234, interactions: 12840,
    tags: ['Poetry', 'Philosophy', 'Song Dynasty', 'Chinese Culture'], owner: 'scholar', featured: true,
  },
  {
    id: '2', name: 'Socrates', preview: 'Ancient Greek philosopher, father of Western philosophy.',
    type: 'mentor', rating: 4.8, reviews: 189, interactions: 9870,
    tags: ['Philosophy', 'Ancient Greece', 'Ethics'], owner: 'philosopher', featured: true,
  },
  {
    id: '3', name: 'Grandma Yukiyo', preview: 'Japanese grandmother, 92 years of wisdom and warmth.',
    type: 'beloved', rating: 5.0, reviews: 45, interactions: 3200,
    tags: ['Family', 'Cooking', 'Japanese'], owner: 'newbie',
  },
  {
    id: '4', name: 'Ada Lovelace', preview: 'Mathematician, first computer programmer.',
    type: 'expert', rating: 4.7, reviews: 128, interactions: 7650,
    tags: ['Mathematics', 'Computing', 'Victorian Era'], owner: 'techie', featured: true,
  },
  {
    id: '5', name: 'Your Digital Twin', preview: 'A mirror of your own mind and patterns.',
    type: 'self', rating: 4.5, reviews: 67, interactions: 2100,
    tags: ['Self-Discovery', 'AI Mirror'], owner: 'explorer',
  },
  {
    id: '6', name: 'Walt Whitman', preview: 'American poet, pioneer of free verse.',
    type: 'mentor', rating: 4.6, reviews: 95, interactions: 5430,
    tags: ['Poetry', 'American Literature'], owner: 'literati',
  },
  {
    id: '7', name: 'Abuela Maria', preview: 'Mexican grandmother, stories of faith and family.',
    type: 'beloved', rating: 5.0, reviews: 34, interactions: 1890,
    tags: ['Family', 'Mexican Culture', 'Faith'], owner: 'familia',
  },
  {
    id: '8', name: 'Marie Curie', preview: 'Physicist and chemist, pioneer of radioactivity research.',
    type: 'expert', rating: 4.8, reviews: 201, interactions: 11200,
    tags: ['Science', 'Physics', 'Nobel Prize'], owner: 'scientist', featured: true,
  },
];

const typeIcons: Record<string, typeof Ghost> = {
  beloved: Heart,
  mentor: Sparkles,
  self: Star,
  expert: Eye,
};

const typeColors: Record<string, string> = {
  beloved: 'from-pink-500 to-rose-500',
  mentor: 'from-purple-500 to-violet-500',
  self: 'from-blue-500 to-cyan-500',
  expert: 'from-amber-500 to-orange-500',
};

const sortOptions = [
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'newest', label: 'Newest', icon: Clock },
  { value: 'highest_rated', label: 'Highest Rated', icon: Star },
  { value: 'most_interactions', label: 'Most Chatted', icon: Users },
];

export default function SoulDiscoveryPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [filterType, setFilterType] = useState('all');
  const [souls, setSouls] = useState<SoulListing[]>(mockSouls);
  const [featured, setFeatured] = useState<SoulListing[]>([]);
  const [randomSoul, setRandomSoul] = useState<SoulListing | null>(null);

  useEffect(() => {
    setFeatured(mockSouls.filter((s) => s.featured));
    setRandomSoul(mockSouls[Math.floor(Math.random() * mockSouls.length)]);
  }, []);

  const filteredSouls = souls.filter((soul) => {
    const matchesSearch =
      !search ||
      soul.name.toLowerCase().includes(search.toLowerCase()) ||
      soul.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || soul.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleRandomSoul = () => {
    setRandomSoul(mockSouls[Math.floor(Math.random() * mockSouls.length)]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              Discover Souls
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Explore living AI companions distilled from real people. Chat with thinkers, mentors,
              and beloved ones from across time and culture.
            </motion.p>
          </div>

          {/* Random Soul Feature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {randomSoul && (
                  <>
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Ghost className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold mb-1">
                        Meet {randomSoul.name}
                      </h3>
                      <p className="text-gray-400">{randomSoul.preview}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button asChild className="bg-purple-500 hover:bg-purple-600">
                        <Link href={`/chat?soul=${randomSoul.id}`}>
                          Chat Now <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={handleRandomSoul}>
                        <Flame className="w-4 h-4" />
                        Random
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search souls by name, tag, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 bg-gray-900 border-gray-800 h-12 text-lg"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white focus:border-purple-500 outline-none"
              >
                <option value="all">All Types</option>
                <option value="beloved">Beloved</option>
                <option value="mentor">Mentor</option>
                <option value="self">Self</option>
                <option value="expert">Expert</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white focus:border-purple-500 outline-none"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSouls.map((soul, i) => {
              const Icon = typeIcons[soul.type];
              const colors = typeColors[soul.type];
              return (
                <motion.div
                  key={soul.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-6 bg-gray-900/50 border-gray-800 hover:border-purple-500/30 transition-all duration-300 group">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate group-hover:text-purple-400 transition-colors">
                          {soul.name}
                        </h3>
                        <p className="text-sm text-gray-500">by @{soul.owner}</p>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {soul.preview}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {soul.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full bg-gray-800 text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {soul.rating} ({soul.reviews})
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {soul.interactions.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800 flex gap-2">
                      <Button asChild className="flex-1 bg-purple-500 hover:bg-purple-600">
                        <Link href={`/chat?soul=${soul.id}`}>
                          Chat
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="border-gray-700 hover:bg-gray-800"
                      >
                        <Link href={`/soul/${soul.id}`}>
                          Profile
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredSouls.length === 0 && (
            <div className="text-center py-16">
              <Ghost className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500 mb-2">No souls found</h3>
              <p className="text-gray-600">Try a different search or filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
