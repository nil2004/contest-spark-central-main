import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Trophy, Upload, Star, TrendingUp, Clock, Award, Edit, Bell, LogOut, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import Footer from '@/components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const InfluencerDashboard = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [rewards, setRewards] = useState<any[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [contestPerformances, setContestPerformances] = useState<any[]>([]);
  const [numFirstRanks, setNumFirstRanks] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [walletOpen, setWalletOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  // Tab wrapper refs for scrollIntoView
  const tabRefs = {
    dashboard: useRef<HTMLDivElement>(null),
    submissions: useRef<HTMLDivElement>(null),
    rewards: useRef<HTMLDivElement>(null),
    profile: useRef<HTMLDivElement>(null),
    notifications: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const fetchProfileAndData = async () => {
      setLoading(true);
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }
      // Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError || !profileData) {
        setProfile(null);
        setLoading(false);
      } else {
        setProfile(profileData);
        setLoading(false);
      }
      // Submissions (join contests)
      setSubLoading(true);
      const { data: subData } = await supabase
        .from('submissions')
        .select('*, contests(title, platform, deadline, id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      // Precompute ranks for each submission
      let submissionsWithRanks = [];
      if (subData && subData.length > 0) {
        for (const submission of subData) {
          let engagementRank = '-';
          let creativityRank = '-';
          if (submission.contest_id) {
            const { data: allSubs } = await supabase
              .from('submissions')
              .select('user_id, engagement_score, creativity_score')
              .eq('contest_id', submission.contest_id)
              .eq('status', 'Approved');
            if (allSubs) {
              const engagementSorted = [...allSubs]
                .filter(s => s.engagement_score !== undefined && s.engagement_score !== null)
                .sort((a, b) => b.engagement_score - a.engagement_score);
              const creativitySorted = [...allSubs]
                .filter(s => s.creativity_score !== undefined && s.creativity_score !== null)
                .sort((a, b) => b.creativity_score - a.creativity_score);
              const eRank = engagementSorted.findIndex(s => s.user_id === submission.user_id) + 1;
              const cRank = creativitySorted.findIndex(s => s.user_id === submission.user_id) + 1;
              engagementRank = eRank > 0 ? String(eRank) : '-';
              creativityRank = cRank > 0 ? String(cRank) : '-';
            }
          }
          submissionsWithRanks.push({ ...submission, engagementRank, creativityRank });
        }
      }
      setSubmissions(submissionsWithRanks);
      setSubLoading(false);
      // Rewards (Achievements)
      setRewardsLoading(true);
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRewards(rewardsData || []);
      setRewardsLoading(false);
      // Notifications (optional table)
      setNotifLoading(true);
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications(notifData || []);
      setNotifLoading(false);
      // Calculate total earnings
      setTotalEarnings((rewardsData || []).reduce((sum, r) => sum + (Number(r.prize) || 0), 0));
      // Calculate contest performances and #1 ranks
      if (subData && subData.length > 0) {
        // Get unique contest IDs from submissions
        const contestIds = Array.from(new Set(subData.map((s: any) => s.contest_id)));
        let performances: any[] = [];
        let firstRanks = 0;
        for (const contestId of contestIds) {
          // Find the user's submission for this contest
          const userSub = subData.find((s: any) => s.contest_id === contestId);
          if (!userSub) continue;
          // Fetch all approved submissions for this contest
          const { data: allSubs } = await supabase
            .from('submissions')
            .select('*, profiles(full_name)')
            .eq('contest_id', contestId)
            .eq('status', 'Approved');
          // Engagement leaderboard
          const engagementSorted = [...(allSubs || [])]
            .filter(s => s.engagement_score !== undefined && s.engagement_score !== null)
            .sort((a, b) => b.engagement_score - a.engagement_score);
          const engagementRank = engagementSorted.findIndex(s => s.user_id === user.id) + 1;
          // Creativity leaderboard
          const creativitySorted = [...(allSubs || [])]
            .filter(s => s.creativity_score !== undefined && s.creativity_score !== null)
            .sort((a, b) => b.creativity_score - a.creativity_score);
          const creativityRank = creativitySorted.findIndex(s => s.user_id === user.id) + 1;
          if (engagementRank === 1) firstRanks++;
          if (creativityRank === 1) firstRanks++;
          performances.push({
            contestTitle: userSub.contests?.title || 'Unknown',
            contestId,
            engagementRank: engagementRank > 0 ? String(engagementRank) : '-',
            creativityRank: creativityRank > 0 ? String(creativityRank) : '-',
            engagementScore: userSub.engagement_score,
            creativityScore: userSub.creativity_score,
            platform: userSub.contests?.platform,
            deadline: userSub.contests?.deadline,
          });
        }
        setContestPerformances(performances);
        setNumFirstRanks(firstRanks);
      } else {
        setContestPerformances([]);
        setNumFirstRanks(0);
      }
      // Fetch payout history and calculate wallet balance
      const fetchPayouts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: payouts } = await supabase
          .from('payouts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setPayoutHistory(payouts || []);
        // Calculate wallet balance: sum of rewards - sum of payouts
        const totalRewards = (rewardsData || []).reduce((sum, r) => sum + (Number(r.prize) || 0), 0);
        const totalPayouts = (payouts || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        setWalletBalance(totalRewards - totalPayouts);
      };
      fetchPayouts();
    };
    fetchProfileAndData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const saveProfile = async () => {
    if (!profile) return;
    const updateObj: any = {
      full_name: profile.full_name,
      bio: profile.bio,
      instagram: profile.instagram,
      youtube: profile.youtube,
      upi_id: profile.upi_id,
    };
    if ('followers' in profile) updateObj.followers = profile.followers;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    await supabase.from('profiles').update(updateObj).eq('id', user.id);
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(profileData);
    setIsEditing(false);
    setLoading(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const fetchUnread = async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('is_read', false);
    setUnreadCount(data?.length || 0);
  };

  useEffect(() => {
    if (profile) {
      fetchUnread(profile.id);
    }
  }, [notifications, profile]);

  useEffect(() => {
    console.log('Notifications:', notifications);
    console.log('Unread count:', unreadCount);
  }, [notifications, unreadCount]);

  useEffect(() => {
    if (activeTab === 'notifications' && profile) {
      const markRead = async () => {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', profile.id)
          .eq('is_read', false);
        setUnreadCount(0);
      };
      markRead();
    }
  }, [activeTab, profile]);

  useEffect(() => {
    if (tabRefs[activeTab] && tabRefs[activeTab].current) {
      console.log('Scrolling tab into view:', activeTab);
      tabRefs[activeTab].current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-lg text-gray-500">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
          <p className="mb-6 text-gray-600">Please complete your profile before accessing the dashboard.</p>
          <Button onClick={() => navigate('/complete-profile')} className="bg-purple-600 text-white hover:bg-purple-700">Complete Profile</Button>
        </div>
      </div>
    );
  }

  if (profile.status !== 'approved') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full flex flex-col items-center">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-4 mb-4 flex items-center justify-center">
            <Clock className="h-10 w-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Profile Under Review</h2>
          <p className="mb-2 text-gray-600">Your profile is under review. It will be updated within 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-6 sm:py-8 md:py-12">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" />
                <AvatarFallback className="bg-white text-purple-600 text-xl font-bold">SC</AvatarFallback>
              </Avatar>
              <div>
              <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name}</h1>
              <p className="text-white/90 text-sm md:text-base">{profile.followers} followers</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Link to="/contests">
              <Button className="bg-white text-purple-600 hover:bg-gray-100 text-sm md:text-base">
                <Trophy className="h-4 w-4 mr-2" />
                Browse Contests
              </Button>
            </Link>
            <Button
              onClick={() => setWalletOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white bg-gradient-to-r from-purple-600 to-blue-500 shadow-md hover:from-purple-700 hover:to-blue-600 transition-all border-2 border-white"
              style={{ minWidth: '120px' }}
            >
              <Wallet className="h-5 w-5 mr-2" /> Wallet
            </Button>
            <Button onClick={handleLogout} className="bg-purple-600 text-white hover:bg-purple-700 text-sm md:text-base">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 flex-1 w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-2 mb-4 sm:mb-6 md:mb-8 rounded-lg bg-white/80 shadow-sm">
            <div ref={tabRefs.dashboard} className="flex-1 min-w-[120px]">
              <TabsTrigger value="dashboard" className="w-full">Dashboard</TabsTrigger>
            </div>
            <div ref={tabRefs.submissions} className="flex-1 min-w-[120px]">
              <TabsTrigger value="submissions" className="w-full">My Submissions</TabsTrigger>
            </div>
            <div ref={tabRefs.rewards} className="flex-1 min-w-[120px]">
              <TabsTrigger value="rewards" className="w-full">Rewards</TabsTrigger>
            </div>
            <div ref={tabRefs.profile} className="flex-1 min-w-[120px]">
              <TabsTrigger value="profile" className="w-full">Profile</TabsTrigger>
            </div>
            <div ref={tabRefs.notifications} className="flex-1 min-w-[120px] relative">
              <TabsTrigger value="notifications" className="w-full">
                Notifications
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs">{unreadCount}</span>
                )}
              </TabsTrigger>
            </div>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <Upload className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{subLoading ? '...' : submissions.length}</div>
                  <div className="text-sm text-gray-600">Total Submissions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">{rewardsLoading ? '...' : rewards.length}</div>
                  <div className="text-sm text-gray-600">Achievements</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">1</div>
                  <div className="text-sm text-gray-600">Current #1 Ranks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">₹{totalEarnings.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Earnings</div>
                </CardContent>
              </Card>
            </div>

            {/* Current Contest Performance */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-purple-600" />
                  Current Contest Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {contestPerformances.map((performance, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-green-50 rounded-lg">
                      <h4 className="font-bold text-green-800 mb-1 sm:mb-2 truncate">{performance.contestTitle}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Engagement Rank:</span>
                          <Badge className="bg-green-500">{performance.engagementRank}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Creativity Rank:</span>
                          <Badge className="bg-orange-500">{performance.creativityRank}</Badge>
                      </div>
                        <div className="text-sm text-gray-600">Leading with {performance.engagementScore?.toLocaleString()} engagement points!</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-purple-600" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifLoading ? (
                    <div className="text-gray-500">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="text-gray-500">No notifications yet.</div>
                  ) : notifications.slice(0, 3).map((notification: any) => (
                    <div key={notification.id} className="p-3 rounded-lg border-l-4 bg-blue-50 border-blue-500">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-purple-600" />
                  My Contest Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {subLoading ? (
                    <div className="text-gray-500">Loading submissions...</div>
                  ) : submissions.length === 0 ? (
                    <div className="text-gray-500">No submissions found.</div>
                  ) : submissions.map((submission) => (
                    <div key={submission.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{submission.title}</h3>
                          <p className="text-gray-600 mb-2">{submission.contests?.title}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Submitted: {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '-'}</span>
                            <Badge>{submission.contests?.platform}</Badge>
                            <Badge className={
                              submission.status === 'Approved' ? 'bg-green-500' : 
                              submission.status === 'Under Review' ? 'bg-yellow-500' : 'bg-red-500'
                            }>
                              {submission.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="font-bold text-green-600">#{submission.engagementRank}</div>
                          <div className="text-xs text-gray-600">Engagement Rank</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="font-bold text-blue-600">#{submission.creativityRank}</div>
                          <div className="text-xs text-gray-600">Creativity Rank</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="font-bold text-gray-600">{Number(submission.engagement_score || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Engagement Score</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="font-bold text-gray-600">{submission.creativity_score}</div>
                          <div className="text-xs text-gray-600">Creativity Score</div>
                        </div>
                      </div>
                      <a 
                        href={submission.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-800 text-sm underline"
                      >
                        View Submission →
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-600" />
                  Rewards & Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rewardsLoading ? (
                    <div className="text-gray-500">Loading rewards...</div>
                  ) : rewards.length === 0 ? (
                    <div className="text-gray-500">No rewards found.</div>
                  ) : rewards.map((achievement, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <Trophy className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{achievement.title}</h4>
                          <p className="text-gray-600 text-sm">{achievement.contest} • {achievement.type}</p>
                          <p className="text-gray-500 text-xs">{achievement.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-lg">{achievement.prize}</div>
                        <Badge className="bg-green-500 text-xs">Claimed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-purple-600" />
                    Profile Settings
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-purple-100 text-purple-600 text-2xl font-bold">SC</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <Input 
                        value={profile.full_name}
                        onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Followers</label>
                      <Input 
                        value={profile.followers}
                        onChange={(e) => setProfile({...profile, followers: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <Textarea 
                      value={profile.bio}
                      onChange={(e) => setProfile({...profile, bio: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Instagram Handle</label>
                      <Input 
                        value={profile.instagram}
                        onChange={(e) => setProfile({...profile, instagram: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Channel</label>
                      <Input 
                        value={profile.youtube}
                        onChange={(e) => setProfile({...profile, youtube: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                      <Input
                        value={profile.upi_id || ''}
                        onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                        placeholder="your-upi@bank"
                      />
                    </div>
                  </div>
                  {/* Save Button */}
                  <div className="flex justify-end mt-6">
                    <Button
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold"
                      onClick={saveProfile}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {saveSuccess && (
                    <div className="text-green-600 text-sm text-right mt-2">Profile saved!</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-purple-600" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${
                      notification.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'
                    }`}>
                      <p className="text-gray-800">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-2">{notification.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
      {/* Wallet Dialog - always mounted */}
      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet & Payouts</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <div className="text-lg font-bold">Balance: <span className="text-green-600">₹{walletBalance.toLocaleString()}</span></div>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setPayoutLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            // Insert payout request
            await supabase.from('payouts').insert({
              user_id: user.id,
              amount: Number(payoutAmount),
              status: 'Pending',
              requested_at: new Date().toISOString(),
            });
            setPayoutAmount('');
            setPayoutLoading(false);
          }} className="space-y-2 mb-4">
            <label className="block text-sm font-medium mb-1">Request Payout</label>
            <input
              type="number"
              min="1"
              max={walletBalance}
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter amount (₹)"
              required
            />
            <Button type="submit" className="w-full bg-purple-600 text-white" disabled={payoutLoading || !payoutAmount || Number(payoutAmount) > walletBalance}>
              {payoutLoading ? 'Requesting...' : 'Request Payout'}
            </Button>
          </form>
          <div>
            <div className="font-semibold mb-2">Payout History</div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {payoutHistory.length === 0 ? (
                <div className="text-gray-500 text-sm">No payouts yet.</div>
              ) : payoutHistory.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-1">
                  <span>₹{Number(p.amount).toLocaleString()}</span>
                  <span className={`text-xs ${p.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}`}>{p.status}</span>
                  <span className="text-xs text-gray-400">{p.requested_at ? new Date(p.requested_at).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfluencerDashboard;
