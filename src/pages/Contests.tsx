import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Clock, Users, Search, Filter } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabaseClient';

const Contests = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participantsMap, setParticipantsMap] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('deadline', { ascending: true });
      if (error) setError('Failed to load contests.');
      else setContests(data || []);
      setLoading(false);
    };
    fetchContests();
  }, []);

  // Fetch participants count for each contest
  useEffect(() => {
    const fetchParticipants = async () => {
      if (contests.length === 0) return;
      const { data, error } = await supabase
        .from('submissions')
        .select('contest_id, user_id, status');
      if (error || !data) {
        setParticipantsMap({});
        return;
      }
      const map = {};
      data.forEach((row) => {
        if (row.status !== 'Approved') return;
        if (!map[row.contest_id]) map[row.contest_id] = new Set();
        map[row.contest_id].add(row.user_id);
      });
      const result = {};
      Object.keys(map).forEach(cid => {
        result[cid] = map[cid].size;
      });
      setParticipantsMap(result);
    };
    fetchParticipants();
  }, [contests]);

  const categories = ['all', 'Lifestyle', 'Technology', 'Health & Fitness', 'Food & Cooking', 'Travel', 'Beauty'];
  const platforms = ['all', 'Instagram', 'YouTube', 'TikTok'];

  const filteredContests = contests.filter(contest => {
    const matchesSearch = contest.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contest.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || contest.category === selectedCategory;
    const matchesPlatform =
      selectedPlatform === 'all' ||
      (contest.platform && contest.platform.toLowerCase() === selectedPlatform.toLowerCase());
    return matchesSearch && matchesCategory && matchesPlatform;
  });

  // Helper to format date and days left
  function formatDeadline(deadline: string) {
    if (!deadline) return '';
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formatted = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${diffDays > 0 ? diffDays + ' days left' : 'Ended'} (${formatted})`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Navbar />
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-10 sm:py-16 shadow-lg">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4 drop-shadow-lg">Live Contests</h1>
          <p className="text-base sm:text-xl opacity-90">
            Discover amazing contests and compete for prizes in dual leaderboards
          </p>
        </div>
      </div>
      <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search contests or brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform === 'all' ? 'All Platforms' : platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Contest Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredContests.map((contest) => (
              <Card key={contest.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border-2 border-transparent hover:border-purple-400 bg-white/90">
              <div className="relative h-40 sm:h-48 md:h-56 flex items-center justify-center" style={contest.banner_url ? { backgroundImage: `url(${contest.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>
                {/* Brand Logo */}
                {contest.brand_logo_url && (
                  <img src={contest.brand_logo_url} alt="Brand Logo" className="absolute top-2 left-2 sm:top-4 sm:left-4 h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-full bg-white border shadow" />
                )}
                {/* Fallback Trophy Icon if no banner */}
                {!contest.banner_url && (
                  <div className="text-center text-white">
                    <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-1 sm:mb-2 opacity-80" />
                    <span className="text-xs sm:text-sm font-medium truncate block max-w-[120px] mx-auto">{contest.brand}</span>
                  </div>
                )}
                {/* Platform Badge */}
                <Badge className={`absolute top-2 right-2 sm:top-4 sm:right-4 ${contest.status === 'Ending Soon' ? 'bg-red-500' : 'bg-orange-500'} text-xs sm:text-sm`}>{contest.platform}</Badge>
                {contest.status === 'Ending Soon' && (
                    <Badge className="absolute top-2 left-16 sm:top-4 sm:left-20 bg-red-500 animate-pulse text-xs sm:text-sm">Ending Soon!</Badge>
                )}
                {/* Total Prize Overlay */}
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-gradient-to-r from-purple-500 to-pink-500 px-2 sm:px-4 py-1 rounded-full shadow-lg text-white font-bold text-xs sm:text-sm border-2 border-white">
                  Total Prize: ₹{(Number(contest.prize_engagement || 0) + Number(contest.prize_creativity || 0)).toLocaleString()}
                </div>
              </div>
              <CardHeader>
                  <CardTitle className="text-lg group-hover:text-purple-600 transition-colors font-semibold">
                  {contest.title}
                </CardTitle>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <Badge variant="outline">{contest.category}</Badge>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDeadline(contest.deadline)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {contest.description}
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Engagement Prize:</span>
                    <span className="font-bold text-green-600">₹{Number(contest.prize_engagement || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Creativity Prize:</span>
                    <span className="font-bold text-blue-600">₹{Number(contest.prize_creativity || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Participants:</span>
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {participantsMap[contest.id] || 0}
                    </span>
                  </div>
                </div>
                <Link to={`/contest/${contest.id}`}>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    View Details & Submit
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
          </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contests;
