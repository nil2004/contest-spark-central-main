import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Clock, Users, Upload, Star, TrendingUp, Award, CheckCircle, Heart, MessageCircle, Share2, Eye, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ContestDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [description, setDescription] = useState('');
  const [contest, setContest] = useState<any>(null);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [engagementLeaders, setEngagementLeaders] = useState<any[]>([]);
  const [creativityLeaders, setCreativityLeaders] = useState<any[]>([]);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [previousRanks, setPreviousRanks] = useState({});
  const [prizeTiers, setPrizeTiers] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    const fetchContest = async () => {
      setLoading(true);
      if (!id) return;
      const { data, error } = await supabase.from('contests').select('*').eq('id', id).single();
      setContest(data || null);
      setLoading(false);
    };
    fetchContest();
  }, [id]);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('submissions')
        .select('user_id')
        .eq('contest_id', id)
        .eq('status', 'Approved');
      if (data) {
        const unique = new Set(data.map((row: any) => row.user_id));
        setParticipants(unique.size);
      } else {
        setParticipants(0);
      }
    };
    fetchParticipants();
  }, [id]);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('submissions')
        .select('*, profiles(full_name, instagram)')
        .eq('contest_id', id)
        .eq('status', 'Approved');
      if (data) {
        // Engagement Leaders
        const engagement = [...data]
          .filter(sub => sub.engagement_score !== undefined && sub.engagement_score !== null)
          .sort((a, b) => b.engagement_score - a.engagement_score)
          .map((sub, idx) => ({
            rank: idx + 1,
            name: sub.profiles?.full_name || 'Unknown',
            handle: sub.profiles?.instagram || '',
            score: sub.engagement_score,
            prize: '-',
            likes: sub.likes ?? 0,
            comments: sub.comments ?? 0,
            shares: sub.shares ?? 0,
            views: sub.views ?? 0
          }));
        setEngagementLeaders(engagement);
        // Creativity Leaders
        const creativity = [...data]
          .filter(sub => sub.creativity_score !== undefined && sub.creativity_score !== null)
          .sort((a, b) => b.creativity_score - a.creativity_score)
          .map((sub, idx) => ({
            rank: idx + 1,
            name: sub.profiles?.full_name || 'Unknown',
            handle: sub.profiles?.instagram || '',
            score: sub.creativity_score,
            prize: '-',
            likes: sub.likes ?? 0,
            comments: sub.comments ?? 0,
            shares: sub.shares ?? 0,
            views: sub.views ?? 0
          }));
        setCreativityLeaders(creativity);
      } else {
        setEngagementLeaders([]);
        setCreativityLeaders([]);
      }
    };
    fetchLeaderboards();
  }, [id]);

  useEffect(() => {
    const fetchUserSubmission = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('contest_id', id)
        .eq('user_id', user.id)
        .single();
      setUserSubmission(data || null);
    };
    fetchUserSubmission();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchPrizeTiers = async () => {
      const { data, error } = await supabase
        .from('prize_tiers')
        .select('*')
        .eq('contest_id', id);
      setPrizeTiers(data || []);
    };
    fetchPrizeTiers();
  }, [id]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  if (loading || !contest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading contest details...</div>
      </div>
    );
  }

  // Fallbacks for rules/guidelines if not present in DB
  const rules = contest?.rules || [
    'Must use at least one product in your content',
    'Tag the brand and use the official hashtag',
    'Original content only - no reposts',
    'Must be posted during contest period',
    'Family-friendly content only'
  ];
  const guidelines = contest?.guidelines || [
    'High-quality photos/videos preferred',
    'Creative angles and compositions encouraged',
    'Natural lighting works best with our products',
    'Show the product in use, not just display'
  ];

  // Helper to format deadline
  function formatDeadline(deadline: string) {
    if (!deadline) return '';
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formatted = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${diffDays > 0 ? diffDays + ' days left' : 'Ended'} (${formatted})`;
  }

  // Helper to get possible prize for a given rank
  function getPossiblePrize(rank, type = 'engagement') {
    if (!prizeTiers.length) return '-';
    // leaderboard_type: 'engagement' or 'creativity'
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

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please provide your content URL",
        variant: "destructive"
      });
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to submit your entry.",
        variant: "destructive"
      });
      return;
    }

    // Insert submission
    const { error } = await supabase.from('submissions').insert({
      contest_id: id,
      user_id: user.id,
      url: submissionUrl,
      description,
      status: 'Pending Review'
    });

    if (error) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Submission Successful!",
      description: "Your entry has been submitted and is under review.",
    });

    setSubmissionUrl('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4">
            <Link to="/contests" className="text-white/80 hover:text-white mr-4">
              ← Back to Contests
            </Link>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                  <h1 className="text-4xl font-bold mb-2">{contest?.title || "Loading..."}</h1>
              <div className="flex items-center space-x-4 text-white/90">
                    <span>by {contest?.brand || "Loading..."}</span>
                    <Badge className="bg-orange-500">{contest?.platform || "Loading..."}</Badge>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                      {formatDeadline(contest?.deadline)}
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="flex items-center text-white/90 mb-2">
                <Users className="h-4 w-4 mr-1" />
                    {participants} participants
                  </div>
                <div className="text-sm text-white/80">
                  Ends: {contest?.deadline ? new Date(contest.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "Loading..."}
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className={isLoggedIn ? '' : 'filter blur-sm pointer-events-none select-none'}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contest Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                  Contest Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                      <p className="text-gray-700 mb-6 leading-relaxed">{contest?.description || "Loading..."}</p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <div className="font-bold text-2xl text-green-600">
                            {contest?.prize_engagement !== undefined ? `₹${Number(contest.prize_engagement).toLocaleString()}` : "Loading..."}
                          </div>
                    <div className="text-sm text-gray-600">Engagement Prize</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <div className="font-bold text-2xl text-blue-600">
                            {contest?.prize_creativity !== undefined ? `₹${Number(contest.prize_creativity).toLocaleString()}` : "Loading..."}
                          </div>
                    <div className="text-sm text-gray-600">Creativity Prize</div>
                  </div>
                </div>

                <Tabs defaultValue="rules" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rules">Rules</TabsTrigger>
                    <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
                  </TabsList>
                  <TabsContent value="rules" className="mt-4">
                    <ul className="space-y-2">
                            {(() => {
                              let rulesArr = contest.rules;
                              if (typeof rulesArr === 'string') {
                                if (rulesArr.trim().startsWith('[') && rulesArr.trim().endsWith(']')) {
                                  try { rulesArr = JSON.parse(rulesArr); } catch {}
                                } else {
                                  rulesArr = rulesArr.split('\n').filter(Boolean);
                                }
                              }
                              if (!Array.isArray(rulesArr)) rulesArr = ['No rules provided.'];
                              return rulesArr.map((rule: string, idx: number) => (
                                <li key={idx} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{rule}</span>
                        </li>
                              ));
                            })()}
                    </ul>
                  </TabsContent>
                  <TabsContent value="guidelines" className="mt-4">
                    <ul className="space-y-2">
                            {(() => {
                              let guidelinesArr = contest.guidelines;
                              if (typeof guidelinesArr === 'string') {
                                if (guidelinesArr.trim().startsWith('[') && guidelinesArr.trim().endsWith(']')) {
                                  try { guidelinesArr = JSON.parse(guidelinesArr); } catch {}
                                } else {
                                  guidelinesArr = guidelinesArr.split('\n').filter(Boolean);
                                }
                              }
                              if (!Array.isArray(guidelinesArr)) guidelinesArr = ['No guidelines provided.'];
                              return guidelinesArr.map((g: string, idx: number) => (
                                <li key={idx} className="flex items-start">
                          <Star className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{g}</span>
                        </li>
                              ));
                            })()}
                    </ul>
                  </TabsContent>
                </Tabs>
                  </CardContent>
                </Card>

                  {/* Prize Tiers */}
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                        Prize Tiers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {prizeTiers.length === 0 ? (
                        <div className="text-gray-500">No prize tiers defined for this contest.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="font-semibold text-green-700 mb-2">Engagement Leaderboard</div>
                            <ul className="space-y-1">
                              {getNonOverlappingPrizeTiers(prizeTiers, 'engagement').map((tier, idx) => (
                                <li key={idx} className="flex items-center">
                                  <span className="inline-block bg-green-100 text-green-700 rounded px-2 py-0.5 text-xs font-semibold mr-2">
                                    Rank {tier.rank_min}{tier.rank_min !== tier.rank_max ? `-${tier.rank_max}` : ''}
                                  </span>
                                  <span className="font-medium text-gray-700">₹{tier.prize_amount}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="font-semibold text-blue-700 mb-2">Creativity Leaderboard</div>
                            <ul className="space-y-1">
                              {getNonOverlappingPrizeTiers(prizeTiers, 'creativity').map((tier, idx) => (
                                <li key={idx} className="flex items-center">
                                  <span className="inline-block bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs font-semibold mr-2">
                                    Rank {tier.rank_min}{tier.rank_min !== tier.rank_max ? `-${tier.rank_max}` : ''}
                                  </span>
                                  <span className="font-medium text-gray-700">₹{tier.prize_amount}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
              </CardContent>
            </Card>

            {/* Leaderboards */}
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
                            {engagementLeaders.map((entry) => (
                              <div
                                key={entry.rank}
                                className={`flex flex-col sm:flex-row sm:items-center p-2 sm:p-3 mb-2 rounded-xl shadow-sm bg-white border overflow-x-hidden transition-all hover:shadow-lg ${entry.rank <= 3 ? 'border-yellow-300' : 'border-gray-200'}`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center w-full">
                                  <div className="flex flex-row items-center flex-wrap gap-x-2 gap-y-1 w-full sm:w-auto">
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
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                      <div className="font-bold text-gray-800 text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">{entry.name}</div>
                                      {entry.handle && (
                                        <a
                                          href={entry.handle}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs px-2 py-0.5 border border-blue-200 rounded-full text-blue-600 hover:bg-blue-50 transition ml-1 whitespace-nowrap"
                                          style={{ fontSize: '11px', lineHeight: '18px' }}
                                        >
                                          View Post
                                        </a>
                                      )}
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
                                    <div className="flex flex-row items-center flex-shrink-0 ml-auto space-x-2">
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
                              {creativityLeaders.map((entry) => (
                                <div
                                  key={entry.rank}
                                  className={`flex flex-col sm:flex-row sm:items-center p-2 sm:p-3 mb-2 rounded-xl shadow-sm bg-white border overflow-x-hidden transition-all hover:shadow-lg ${entry.rank <= 3 ? 'border-yellow-300' : 'border-gray-200'}`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center w-full">
                                    <div className="flex flex-row items-center flex-wrap gap-x-2 gap-y-1 w-full sm:w-auto">
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
                                      <div className="min-w-0 flex-1 flex items-center gap-2">
                                        <div className="font-bold text-gray-800 text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">{entry.name}</div>
                                        {entry.handle && (
                                          <a
                                            href={entry.handle}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs px-2 py-0.5 border border-blue-200 rounded-full text-blue-600 hover:bg-blue-50 transition ml-1 whitespace-nowrap"
                                            style={{ fontSize: '11px', lineHeight: '18px' }}
                                          >
                                            View Post
                                          </a>
                                        )}
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
                                      <div className="flex flex-row items-center flex-shrink-0 ml-auto space-x-2">
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submit Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-purple-600" />
                  Submit Your Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                      {userSubmission ? (
                        userSubmission.status === 'Approved' ? (
                          <div className="flex flex-col items-center py-8">
                            <svg className="w-12 h-12 text-green-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"></path>
                            </svg>
                            <div className="text-lg font-semibold text-green-700 mb-1">Your entry is approved!</div>
                            <div className="text-sm text-gray-600">Congratulations! Your entry is now live and you are on the leaderboard.</div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-8">
                            <svg className="w-12 h-12 text-yellow-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"></path>
                            </svg>
                            <div className="text-lg font-semibold text-gray-700 mb-1">Your entry is under review!</div>
                            <div className="text-sm text-gray-500">You will be notified once it is approved or scored.</div>
                          </div>
                        )
                      ) : (
                <form onSubmit={handleSubmission} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content URL *
                    </label>
                    <Input
                      placeholder="https://instagram.com/p/your-post"
                      value={submissionUrl}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <Textarea
                      placeholder="Tell us about your entry..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    Submit Entry
                  </Button>
                </form>
                      )}
                <p className="text-xs text-gray-500 mt-3">
                  By submitting, you agree to the contest rules and terms.
                </p>
              </CardContent>
            </Card>

            {/* Contest Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Contest Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Participants:</span>
                        <span className="font-bold">{participants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform:</span>
                        <Badge>{contest?.platform || "Loading..."}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                        <Badge variant="outline">{contest?.category || "Loading..."}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Prize Pool:</span>
                        <span className="font-bold text-green-600">
                          ₹{(Number(contest?.prize_engagement || 0) + Number(contest?.prize_creativity || 0)).toLocaleString()}
                        </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
          {!isLoggedIn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="bg-white/80 backdrop-blur-md rounded-lg p-8 shadow-xl border border-purple-200 flex flex-col items-center">
                <span className="text-2xl font-bold text-purple-700 mb-2">Login Required</span>
                <span className="text-gray-700 mb-4">Please log in or sign up to view the full contest details.</span>
                <a href="/login" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-purple-700 hover:to-blue-700 transition">Login / Signup</a>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContestDetail;
