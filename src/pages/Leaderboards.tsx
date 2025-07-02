import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, TrendingUp, Star, Award, Crown, Heart, MessageCircle, Share2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Leaderboards = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [engagementLeaderboard, setEngagementLeaderboard] = useState<any[]>([]);
  const [creativityLeaderboard, setCreativityLeaderboard] = useState<any[]>([]);
  const [prizeTiers, setPrizeTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Fetch all contests for selector
  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('contests').select('*').order('deadline', { ascending: true });
      setContests(data || []);
      setLoading(false);
      if (data && data.length > 0 && !selectedContest) {
        setSelectedContest(data[0].id);
      }
    };
    fetchContests();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  // Fetch submissions and prize tiers for selected contest
  useEffect(() => {
    if (!selectedContest) return;
    setLoading(true);
    const fetchData = async () => {
      // Submissions with profile join
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('*, profiles(full_name, instagram)')
        .eq('contest_id', selectedContest)
        .eq('status', 'Approved');
      // Prize Tiers
      const { data: tiers, error: tierError } = await supabase
        .from('prize_tiers')
        .select('*')
        .eq('contest_id', selectedContest);
      setPrizeTiers(tiers || []);
      // Engagement Leaderboard
      const engagement = (submissions || [])
        .filter(sub => sub.engagement_score !== undefined && sub.engagement_score !== null)
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .map((sub, idx) => ({
          rank: idx + 1,
          name: sub.profiles?.full_name || sub.user_id || 'Unknown',
          handle: sub.profiles?.instagram || '',
          score: sub.engagement_score,
          user_id: sub.user_id,
          likes: sub.likes ?? 0,
          comments: sub.comments ?? 0,
          shares: sub.shares ?? 0,
          views: sub.views ?? 0,
          prize: getPossiblePrize(idx + 1, 'engagement'),
        }));
      setEngagementLeaderboard(engagement);
      // Creativity Leaderboard
      const creativity = (submissions || [])
        .filter(sub => sub.creativity_score !== undefined && sub.creativity_score !== null)
        .sort((a, b) => b.creativity_score - a.creativity_score)
        .map((sub, idx) => ({
          rank: idx + 1,
          name: sub.profiles?.full_name || sub.user_id || 'Unknown',
          handle: sub.profiles?.instagram || '',
          score: sub.creativity_score,
          user_id: sub.user_id,
          likes: sub.likes ?? 0,
          comments: sub.comments ?? 0,
          shares: sub.shares ?? 0,
          views: sub.views ?? 0,
          prize: getPossiblePrize(idx + 1, 'creativity'),
        }));
      setCreativityLeaderboard(creativity);
      setLoading(false);
    };
    fetchData();
  }, [selectedContest]);

  // Helper to get possible prize for a given rank
  function getPossiblePrize(rank: number, type = 'engagement') {
    if (!prizeTiers.length) return '-';
    const tier = prizeTiers.find(t => t.leaderboard_type === type && rank >= t.rank_min && rank <= t.rank_max);
    if (tier) return `₹${tier.prize_amount}`;
    return '-';
  }

  // Helper to get non-overlapping prize tiers for display
  function getNonOverlappingPrizeTiers(prizeTiers, type = 'engagement') {
    // Sort by rank_min ascending
    const tiers = prizeTiers.filter(t => t.leaderboard_type === type).sort((a, b) => a.rank_min - b.rank_min);
    let usedRanks = new Set();
    let result = [];
    for (let tier of tiers) {
      // For group prizes (e.g., Top 10), auto-adjust to next available N ranks
      let min = tier.rank_min;
      let max = tier.rank_max;
      // If this is a group prize (label includes 'Top'), auto-adjust
      if (/top\s*\d+/i.test(tier.rank_label)) {
        // Find the highest used rank
        let lastUsed = usedRanks.size > 0 ? Math.max(...Array.from(usedRanks) as number[]) : 0;
        min = lastUsed + 1;
        // Extract N from 'Top N'
        const match = tier.rank_label.match(/top\s*(\d+)/i);
        const N = match ? parseInt(match[1], 10) : (max - min + 1);
        max = min + N - 1;
      }
      // Skip ranks already used
      if ([...Array(max - min + 1).keys()].some(i => usedRanks.has(min + i))) continue;
      // Mark these ranks as used
      for (let r = min; r <= max; r++) usedRanks.add(r);
      result.push({ ...tier, rank_min: min, rank_max: max });
    }
    return result;
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Award className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-orange-600" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">{rank}</div>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contest Leaderboards</h1>
          <p className="text-xl opacity-90">
            Track the top performers in engagement and creativity competitions
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contest Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                Select Contest
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedContest} onValueChange={setSelectedContest}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Choose a contest" />
              </SelectTrigger>
              <SelectContent>
                {contests.map((contest) => (
                  <SelectItem key={contest.id} value={contest.id}>
                    <div className="flex items-center justify-between w-full">
                        <span>{contest.title}</span>
                      <Badge className={contest.status === 'Active' ? 'bg-green-500 ml-2' : 'bg-gray-500 ml-2'}>
                        {contest.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Leaderboards */}
          {loading ? (
            <div className="text-center text-lg text-gray-500 py-12">Loading leaderboard...</div>
          ) : (
            <>
              <div className="relative">
                <div className={isLoggedIn ? '' : 'filter blur-sm pointer-events-none select-none'}>
            <Card>
              <CardHeader>
                      <CardTitle className="flex items-center">
                        <Award className="h-5 w-5 mr-2 text-purple-600" />
                        Live Leaderboards
                </CardTitle>
              </CardHeader>
              <CardContent>
                      <div className="mb-4 p-2 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded text-sm">
                        <strong>Note:</strong> The leaderboard updates every 24 hours at 10:00 PM.
                      </div>
                      <Tabs defaultValue="engagement" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="engagement">Engagement Leaders</TabsTrigger>
                          <TabsTrigger value="creativity">Creativity Leaders</TabsTrigger>
                        </TabsList>
                        <TabsContent value="engagement" className="mt-4">
                          <div className="mb-2 p-2 bg-green-50 border-l-4 border-green-400 text-green-800 rounded">
                            <strong>Engagement Leaders:</strong> Ranked by total engagement score (Likes + 2×Comments + 3×Shares). Only approved submissions are counted.
                          </div>
                          <div className="space-y-3">
                  {engagementLeaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 mb-3 rounded-xl shadow-sm bg-white border transition-all hover:shadow-lg ${entry.rank <= 3 ? 'border-yellow-300' : 'border-gray-200'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center w-full">
                        <div className="flex flex-row items-center flex-wrap gap-x-2 gap-y-1 w-full">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm mr-1 ${
                            entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' : entry.rank === 2 ? 'bg-gray-200 text-gray-700' : entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            #{entry.rank}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                            entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-gray-400' : entry.rank === 3 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {entry.rank <= 3 ? <Trophy className="h-5 w-5" /> : entry.rank}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-800 text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">{entry.name}</div>
                            <div className="text-xs text-gray-500 break-all max-w-[140px] sm:max-w-xs">{entry.handle}</div>
                          </div>
                          {/* Stats row on desktop */}
                          <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 ml-2">
                            <span className="flex items-center space-x-1">
                              <Heart className="h-4 w-4 text-pink-500" />
                              <span>{entry.likes ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="h-4 w-4 text-blue-500" />
                              <span>{entry.comments ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Share2 className="h-4 w-4 text-green-500" />
                              <span>{entry.shares ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Eye className="h-4 w-4 text-gray-400" />
                              <span>{entry.views ?? 0}</span>
                            </span>
                          </div>
                          {/* Score badge: always last, ml-auto on desktop */}
                          <div className="flex flex-row items-center flex-shrink-0 mt-2 sm:mt-0 sm:ml-auto">
                            <span className="inline-block bg-green-100 text-green-700 font-semibold px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm mb-0 whitespace-nowrap">
                              Score: {entry.score.toLocaleString()} {getPossiblePrize(entry.rank, 'engagement') !== '-' && (
                                <span className="ml-2 text-yellow-600 font-bold">{getPossiblePrize(entry.rank, 'engagement')}</span>
                              )}
                            </span>
                          </div>
                        </div>
                        {/* Stats row on mobile */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 mt-2 bg-gray-50 rounded px-2 py-1 sm:hidden">
                          <span className="flex items-center space-x-1">
                            <Heart className="h-4 w-4 text-pink-500" />
                            <span>{entry.likes ?? 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            <span>{entry.comments ?? 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Share2 className="h-4 w-4 text-green-500" />
                            <span>{entry.shares ?? 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span>{entry.views ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          </TabsContent>
                        <TabsContent value="creativity" className="mt-4">
                          <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded">
                            <strong>Creativity Leaders:</strong> Ranked by creativity score (as judged by the brand). Only approved submissions are counted.
                          </div>
                          <div className="space-y-3">
                  {creativityLeaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 mb-3 rounded-xl shadow-sm bg-white border transition-all hover:shadow-lg ${entry.rank <= 3 ? 'border-blue-300' : 'border-gray-200'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center w-full">
                        <div className="flex flex-row items-center flex-wrap gap-x-2 gap-y-1 w-full">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm mr-1 ${
                            entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' : entry.rank === 2 ? 'bg-gray-200 text-gray-700' : entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            #{entry.rank}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                            entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-gray-400' : entry.rank === 3 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {entry.rank <= 3 ? <Trophy className="h-5 w-5" /> : entry.rank}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-800 text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">{entry.name}</div>
                            <div className="text-xs text-gray-500 break-all max-w-[140px] sm:max-w-xs">{entry.handle}</div>
                          </div>
                          {/* Stats row on desktop */}
                          <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 ml-2">
                            <span className="flex items-center space-x-1">
                              <Heart className="h-4 w-4 text-pink-500" />
                              <span>{entry.likes ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="h-4 w-4 text-blue-500" />
                              <span>{entry.comments ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Share2 className="h-4 w-4 text-green-500" />
                              <span>{entry.shares ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Eye className="h-4 w-4 text-gray-400" />
                              <span>{entry.views ?? 0}</span>
                            </span>
                          </div>
                          {/* Score badge: always last, ml-auto on desktop */}
                          <div className="flex flex-row items-center flex-shrink-0 mt-2 sm:mt-0 sm:ml-auto">
                            <span className="inline-block bg-blue-100 text-blue-700 font-semibold px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm mb-0 whitespace-nowrap">
                              Score: {entry.score}{entry.rank <= 3 ? ' 🏆' : ''} {getPossiblePrize(entry.rank, 'creativity') !== '-' && (
                                <span className="ml-2 text-yellow-600 font-bold">{getPossiblePrize(entry.rank, 'creativity')}</span>
                              )}
                            </span>
                          </div>
                        </div>
                        {/* Stats row on mobile */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 mt-2 bg-gray-50 rounded px-2 py-1 sm:hidden">
                          <span className="flex items-center space-x-1">
                            <Heart className="h-4 w-4 text-pink-500" />
                            <span>{entry.likes ?? 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                            <span>{entry.comments ?? 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Share2 className="h-4 w-4 text-green-500" />
                            <span>{entry.shares ?? 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span>{entry.views ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                        </TabsContent>
                      </Tabs>
              </CardContent>
            </Card>

                  {/* Dynamic Prize Distribution Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <TrendingUp className="h-5 w-5 mr-2" />
                Engagement Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                          {getNonOverlappingPrizeTiers(prizeTiers, 'engagement').map((tier, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                  <span className="flex items-center">
                                <Badge className="mr-2 bg-green-100 text-green-700">Rank {tier.rank_min}{tier.rank_min !== tier.rank_max ? `-${tier.rank_max}` : ''}</Badge>
                                {tier.rank_label}
                  </span>
                              <span className="font-bold text-green-600">₹{tier.prize_amount}</span>
                </div>
                          ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-600">
                <Star className="h-5 w-5 mr-2" />
                Creativity Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                          {getNonOverlappingPrizeTiers(prizeTiers, 'creativity').map((tier, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                  <span className="flex items-center">
                                <Badge className="mr-2 bg-blue-100 text-blue-700">Rank {tier.rank_min}{tier.rank_min !== tier.rank_max ? `-${tier.rank_max}` : ''}</Badge>
                                {tier.rank_label}
                  </span>
                              <span className="font-bold text-blue-600">₹{tier.prize_amount}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                {!isLoggedIn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="bg-white/80 backdrop-blur-md rounded-lg p-8 shadow-xl border border-purple-200 flex flex-col items-center">
                      <span className="text-2xl font-bold text-purple-700 mb-2">Login Required</span>
                      <span className="text-gray-700 mb-4">Please log in or sign up to view the full leaderboard.</span>
                      <a href="/login" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-purple-700 hover:to-blue-700 transition">Login / Signup</a>
                </div>
                </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Leaderboards;
