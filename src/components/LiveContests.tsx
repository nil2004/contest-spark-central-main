import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const LiveContests = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) setError('Failed to load contests.');
      else setContests(data || []);
      setLoading(false);
    };
    fetchContests();
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Live Contests</h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Join these exciting contests and compete for amazing prizes in dual leaderboards
          </p>
        </div>

        {loading ? (
          <div className="text-center text-lg text-gray-500">Loading contests...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : contests.length === 0 ? (
          <div className="text-center text-gray-500">No live contests at the moment.</div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {contests.map((contest) => (
            <Card key={contest.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="relative h-40 sm:h-48 md:h-56 flex items-center justify-center" style={contest.banner_url ? { backgroundImage: `url(${contest.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>
                {/* Brand Logo */}
                {contest.brand_logo_url && (
                  <img src={contest.brand_logo_url} alt="Brand Logo" className="absolute top-2 left-2 sm:top-4 sm:left-4 h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-full bg-white border shadow" />
                )}
                {/* Fallback Trophy Icon if no banner */}
                {!contest.banner_url && (
                  <div className="text-center text-white">
                    <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-1 sm:mb-2 opacity-80" />
                    <span className="text-xs sm:text-sm font-medium truncate block max-w-[120px] mx-auto">{contest.brand || contest.title}</span>
                  </div>
                )}
                <Badge className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-orange-500 text-xs sm:text-sm">{contest.platform}</Badge>
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-gradient-to-r from-purple-600 to-orange-400 text-white text-xs font-bold px-2 sm:px-4 py-1 rounded-lg shadow-lg border-2 border-white/30">
                  Total Prize: ₹{(Number(contest.prize_engagement) + Number(contest.prize_creativity)).toLocaleString()}
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                  {contest.title}
                </CardTitle>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <Badge variant="outline">{contest.category}</Badge>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                      {contest.deadline ? new Date(contest.deadline).toLocaleDateString() : ''}
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
                      <span className="font-bold text-green-600">₹{contest.prize_engagement}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Creativity Prize:</span>
                      <span className="font-bold text-blue-600">₹{contest.prize_creativity}</span>
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
        )}

        <div className="text-center">
          <Link to="/contests">
            <Button size="lg" variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white">
              View All Contests
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LiveContests;
