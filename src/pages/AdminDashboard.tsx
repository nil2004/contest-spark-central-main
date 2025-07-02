import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Plus, Users, Trophy, Upload, Star, TrendingUp, Eye, Edit, Trash2, Award, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [selectedContest, setSelectedContest] = useState('summer-vibes');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [contests, setContests] = useState<any[]>([]);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [newContest, setNewContest] = useState({
    title: '', brand: '', description: '', platform: '', category: '', status: 'Active', engagementPrize: '', creativityPrize: '', deadline: '', rules: '', guidelines: ''
  });
  const [creating, setCreating] = useState(false);
  const [editContest, setEditContest] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState('');
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [prizeTiers, setPrizeTiers] = useState<any[]>([]);
  const [editEngagement, setEditEngagement] = useState({});
  const [editPrizeTiers, setEditPrizeTiers] = useState<any[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatus, setProfileStatus] = useState('all');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifSending, setNotifSending] = useState(false);
  const navigate = useNavigate();

  // Protect route: redirect if not admin
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') !== 'true') {
      navigate('/admin-login');
    }
  }, [navigate]);

  // Move fetchSubmissions to top-level so it can be called from handleApproveSubmission
  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    const { data, error } = await supabase
      .from('submissions')
      .select('*, profiles(full_name, instagram), contests(title, platform)')
      .order('submitted_at', { ascending: false });
    if (error) {
      setSubmissions([]);
    } else {
      setSubmissions(data || []);
    }
    setSubmissionsLoading(false);
  };

  // Real data: Leaderboards
  const [engagementLeaderboard, setEngagementLeaderboard] = useState<any[]>([]);
  const [creativityLeaderboard, setCreativityLeaderboard] = useState<any[]>([]);
  useEffect(() => {
    if (!selectedContest) return;
    // Engagement leaderboard
    const fetchEngagement = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*, profiles(full_name, instagram)')
        .eq('contest_id', selectedContest)
        .eq('status', 'Approved')
        .order('engagement_score', { ascending: false })
        .limit(20);
      setEngagementLeaderboard(data || []);
    };
    // Creativity leaderboard
    const fetchCreativity = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*, profiles(full_name, instagram)')
        .eq('contest_id', selectedContest)
        .eq('status', 'Approved')
        .order('creativity_score', { ascending: false })
        .limit(20);
      setCreativityLeaderboard(data || []);
    };
    fetchEngagement();
    fetchCreativity();
  }, [selectedContest]);

  useEffect(() => {
    const fetchProfiles = async () => {
      setProfilesLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      setProfiles(data || []);
      setProfilesLoading(false);
    };
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    setContestsLoading(true);
    const { data, error } = await supabase.from('contests').select('*').order('deadline', { ascending: true });
    setContests(data || []);
    setContestsLoading(false);
  };

  // Helper to get next available rank after all individual prizes
  function getNextAvailableRank(prizeTiers, leaderboardType) {
    // Find all used ranks for this leaderboard
    const used = prizeTiers
      .filter(t => t.leaderboard_type === leaderboardType && !/top\s*\d+/i.test(t.rank_label))
      .map(t => Number(t.rank_min));
    return used.length ? Math.max(...used) + 1 : 1;
  }

  // Modified addPrizeTier for group prizes
  const addPrizeTier = (type = 'engagement', label = '') => {
    let newTier = { leaderboard_type: type, rank_label: label, rank_min: 1, rank_max: 1, prize_amount: 0 };
    if (/top\s*\d+/i.test(label)) {
      // For group prize, auto-set min and max
      const N = parseInt(label.match(/top\s*(\d+)/i)?.[1] || '10', 10);
      const min = getNextAvailableRank(prizeTiers, type);
      newTier.rank_min = min;
      newTier.rank_max = min + N - 1;
    }
    setPrizeTiers([...prizeTiers, newTier]);
  };

  // On save, sort prizeTiers: individual first, then group
  const handleCreateContest = async () => {
    setCreating(true);
    // Sort prizeTiers: individual first, then group
    const sortedPrizeTiers = [
      ...prizeTiers.filter(t => !/top\s*\d+/i.test(t.rank_label)),
      ...prizeTiers.filter(t => /top\s*\d+/i.test(t.rank_label)),
    ];
    const { error, data } = await supabase.from('contests').insert({
      title: newContest.title,
      brand: newContest.brand,
      description: newContest.description,
      platform: newContest.platform,
      category: newContest.category,
      status: newContest.status,
      prize_engagement: Number(newContest.engagementPrize),
      prize_creativity: Number(newContest.creativityPrize),
      deadline: newContest.deadline,
      banner_url: bannerUrl,
      brand_logo_url: brandLogoUrl,
      rules: typeof newContest.rules === 'string' ? newContest.rules.split('\n').filter(Boolean) : newContest.rules,
      guidelines: typeof newContest.guidelines === 'string' ? newContest.guidelines.split('\n').filter(Boolean) : newContest.guidelines
    }).select();
    if (error || !data || !data[0]) {
      setCreating(false);
      console.error('Contest creation error:', error, data);
    toast({
        title: 'Error Creating Contest',
        description: error?.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      return;
    }
    // If contest created, insert prize tiers if any
    if (sortedPrizeTiers.length > 0) {
      const contestId = data[0].id;
      const prizeTierResults = await Promise.all(sortedPrizeTiers.map(tier =>
        supabase.from('prize_tiers').insert({
          contest_id: contestId,
          leaderboard_type: tier.leaderboard_type,
          rank_label: tier.rank_label,
          rank_min: tier.rank_min,
          rank_max: tier.rank_max,
          prize_amount: tier.prize_amount
        })
      ));
      // Optionally, check for errors in prizeTierResults
      const prizeTierError = prizeTierResults.find(r => r.error);
      if (prizeTierError) {
        setCreating(false);
        console.error('Prize tier creation error:', prizeTierError.error);
        toast({
          title: 'Error Creating Prize Tiers',
          description: prizeTierError.error.message,
          variant: 'destructive',
        });
        return;
      }
    }
    setCreating(false);
    setShowCreateDialog(false);
    setNewContest({ title: '', brand: '', description: '', platform: '', category: '', status: 'Active', engagementPrize: '', creativityPrize: '', deadline: '', rules: '', guidelines: '' });
    toast({ title: 'Contest Created!', description: 'New contest has been successfully created.' });
    fetchContests();
  };

  const handleDeleteContest = async (id: string) => {
    const { error } = await supabase.from('contests').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Contest Deleted', description: 'Contest has been deleted.' });
      fetchContests();
    }
  };

  const handleEditContest = async (contest: any) => {
    setEditContest({
      ...contest,
      rules: Array.isArray(contest.rules) ? contest.rules.join('\n') : (contest.rules || ''),
      guidelines: Array.isArray(contest.guidelines) ? contest.guidelines.join('\n') : (contest.guidelines || ''),
    });
    // Fetch prize tiers for this contest
    const { data: tiers } = await supabase
      .from('prize_tiers')
      .select('*')
      .eq('contest_id', contest.id);
    setEditPrizeTiers(tiers || []);
    setEditDialogOpen(true);
  };

  // Do the same for handleUpdateContest (sort and auto-adjust group prizes before saving)
  const handleUpdateContest = async () => {
    // Sort prizeTiers: individual first, then group
    const sortedPrizeTiers = [
      ...editPrizeTiers.filter(t => !/top\s*\d+/i.test(t.rank_label)),
      ...editPrizeTiers.filter(t => /top\s*\d+/i.test(t.rank_label)),
    ];
    // Auto-adjust group prizes
    let usedRanks = new Set(sortedPrizeTiers.filter(t => !/top\s*\d+/i.test(t.rank_label)).map(t => Number(t.rank_min)));
    const adjustedPrizeTiers = sortedPrizeTiers.map(tier => {
      if (/top\s*\d+/i.test(tier.rank_label)) {
        const N = parseInt(tier.rank_label.match(/top\s*(\d+)/i)?.[1] || '10', 10);
        const min = usedRanks.size ? Math.max(...Array.from(usedRanks)) + 1 : 1;
        const max = min + N - 1;
        for (let r = min; r <= max; r++) usedRanks.add(r);
        return { ...tier, rank_min: min, rank_max: max };
      }
      usedRanks.add(Number(tier.rank_min));
      return tier;
    });
    const { error } = await supabase.from('contests').update({
      title: editContest.title,
      brand: editContest.brand,
      description: editContest.description,
      platform: editContest.platform,
      category: editContest.category,
      status: editContest.status,
      prize_engagement: Number(editContest.prize_engagement),
      prize_creativity: Number(editContest.prize_creativity),
      deadline: editContest.deadline,
      rules: typeof editContest.rules === 'string' ? editContest.rules.split('\n').filter(Boolean) : editContest.rules,
      guidelines: typeof editContest.guidelines === 'string' ? editContest.guidelines.split('\n').filter(Boolean) : editContest.guidelines,
      banner_url: bannerUrl || editContest.banner_url,
      brand_logo_url: brandLogoUrl || editContest.brand_logo_url,
    }).eq('id', editContest.id);
    if (!error) {
      // Delete old prize tiers
      await supabase.from('prize_tiers').delete().eq('contest_id', editContest.id);
      // Insert new prize tiers
      if (adjustedPrizeTiers.length > 0) {
        await Promise.all(adjustedPrizeTiers.map(tier =>
          supabase.from('prize_tiers').insert({
            contest_id: editContest.id,
            leaderboard_type: tier.leaderboard_type,
            rank_label: tier.rank_label,
            rank_min: tier.rank_min,
            rank_max: tier.rank_max,
            prize_amount: tier.prize_amount
          })
        ));
      }
      toast({ title: 'Contest Updated', description: 'Contest details have been updated.' });
      setEditDialogOpen(false);
      fetchContests();
    }
  };

  const handleApproveSubmission = async (id: number) => {
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'Approved' })
      .eq('id', id);
    if (!error) {
    toast({
      title: "Submission Approved",
      description: "The submission has been approved and added to leaderboards.",
    });
      fetchSubmissions();
    } else {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleScoreUpdate = async (id: number, type: string, score: number) => {
    const { error } = await supabase
      .from('submissions')
      .update({ creativity_score: score })
      .eq('id', id);
    if (!error) {
    toast({
      title: "Score Updated",
      description: `${type} score has been updated to ${score}.`,
    });
      fetchSubmissions();
    } else {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleApproveProfile = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
    if (!error) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Profile Approved', description: 'Influencer profile has been approved.' });
    }
  };

  const handleRejectProfile = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id);
    if (!error) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Profile Rejected', description: 'Influencer profile has been rejected.' });
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const fileExt = file.name.split('.').pop();
    const filePath = `banners/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('banners').upload(filePath, file, { upsert: true });
    if (error) {
      console.error('Banner upload error:', error);
      alert('Banner upload error: ' + error.message);
    } else {
      const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
      setBannerUrl(data.publicUrl);
    }
  };

  const handleBrandLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrandLogoFile(file);
    const fileExt = file.name.split('.').pop();
    const filePath = `brand-logos/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('brand-logos').upload(filePath, file, { upsert: true });
    if (error) {
      console.error('Brand logo upload error:', error);
      alert('Brand logo upload error: ' + error.message);
    } else {
      const { data } = supabase.storage.from('brand-logos').getPublicUrl(filePath);
      setBrandLogoUrl(data.publicUrl);
    }
  };

  // Prize Tiers UI helpers
  const updatePrizeTier = (idx: number, field: string, value: any) => {
    setPrizeTiers(prizeTiers.map((tier, i) => i === idx ? { ...tier, [field]: value } : tier));
  };
  const removePrizeTier = (idx: number) => {
    setPrizeTiers(prizeTiers.filter((_, i) => i !== idx));
  };

  // Dashboard stats
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [totalPrizePool, setTotalPrizePool] = useState(0);

  // Fetch dashboard stats
  useEffect(() => {
    // Total Participants (unique user_ids in submissions)
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('user_id');
      if (data) {
        const unique = new Set(data.map((row: any) => row.user_id));
        setTotalParticipants(unique.size);
      } else {
        setTotalParticipants(0);
      }
    };
    // Pending Reviews (submissions with status 'Pending Review')
    const fetchPendingReviews = async () => {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending Review');
      setPendingReviews(count || 0);
    };
    fetchParticipants();
    fetchPendingReviews();
  }, []);

  // Compute total prize pool from contests
  useEffect(() => {
    const total = contests.reduce(
      (sum, c) => sum + (Number(c.prize_engagement) || 0) + (Number(c.prize_creativity) || 0),
      0
    );
    setTotalPrizePool(total);
  }, [contests]);

  // Move fetchSubmissions to top-level so it can be called from handleApproveSubmission
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleUpdateEngagement = async (id) => {
    const { likes = 0, comments = 0, shares = 0, views = 0 } = editEngagement[id] || {};
    const engagement_score = likes + (comments * 2) + (shares * 3);
    const { error } = await supabase
      .from('submissions')
      .update({ likes, comments, shares, views, engagement_score })
      .eq('id', id);
    if (!error) {
      toast({ title: 'Updated!', description: 'Engagement score updated.' });
      fetchSubmissions();
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Edit Prize Tiers UI helpers
  const addEditPrizeTier = () => {
    setEditPrizeTiers([...editPrizeTiers, { leaderboard_type: 'engagement', rank_label: '', rank_min: 1, rank_max: 1, prize_amount: 0 }]);
  };
  const updateEditPrizeTier = (idx: number, field: string, value: any) => {
    setEditPrizeTiers(editPrizeTiers.map((tier, i) => i === idx ? { ...tier, [field]: value } : tier));
  };
  const removeEditPrizeTier = (idx: number) => {
    setEditPrizeTiers(editPrizeTiers.filter((_, i) => i !== idx));
  };

  const distributePrizes = async () => {
    // 1. Get all ended contests
    const now = new Date().toISOString();
    const { data: contests } = await supabase
      .from('contests')
      .select('id, deadline')
      .lt('deadline', now);
    if (!contests) return;
    for (const contest of contests) {
      for (const leaderboardType of ['engagement', 'creativity']) {
        // 2. Get prize tiers for this leaderboard
        const { data: prizeTiers } = await supabase
          .from('prize_tiers')
          .select('*')
          .eq('contest_id', contest.id)
          .eq('leaderboard_type', leaderboardType);
        if (!prizeTiers) continue;
        // 3. Get leaderboard (approved submissions, sorted)
        const { data: leaderboard } = await supabase
          .from('submissions')
          .select('user_id, engagement_score, creativity_score, id')
          .eq('contest_id', contest.id)
          .eq('status', 'Approved');
        if (!leaderboard) continue;
        const sorted = [...leaderboard].sort((a, b) =>
          leaderboardType === 'engagement'
            ? (b.engagement_score || 0) - (a.engagement_score || 0)
            : (b.creativity_score || 0) - (a.creativity_score || 0)
        );
        for (const tier of prizeTiers) {
          for (let rank = tier.rank_min; rank <= tier.rank_max; rank++) {
            const winner = sorted[rank - 1];
            if (!winner) continue;
            // Check if already credited
            const { data: alreadyCredited } = await supabase
              .from('wallet_transactions')
              .select('id')
              .eq('user_id', winner.user_id)
              .eq('contest_id', contest.id)
              .eq('leaderboard_type', leaderboardType)
              .eq('prize_tier_id', tier.id)
              .maybeSingle();
            if (alreadyCredited) continue;
            // Credit winner
            await supabase.from('wallet_transactions').insert({
              user_id: winner.user_id,
              contest_id: contest.id,
              leaderboard_type: leaderboardType,
              rank,
              prize_tier_id: tier.id,
              type: 'credit',
              amount: tier.prize_amount,
              reason: 'Contest Prize',
            });
          }
        }
      }
    }
    alert('Prizes distributed for all ended contests!');
  };

  useEffect(() => {
    const fetchPendingPayouts = async () => {
      const { data } = await supabase
        .from('payouts')
        .select('*, profiles(full_name, instagram)')
        .eq('status', 'Pending')
        .order('requested_at', { ascending: true });
      setPendingPayouts(data || []);
    };
    fetchPendingPayouts();
  }, []);

  const handleApprovePayout = async (payout: any) => {
    await supabase.from('payouts').update({ status: 'Completed', processed_at: new Date().toISOString() }).eq('id', payout.id);
    await supabase.from('wallet_transactions').insert({
      user_id: payout.user_id,
      contest_id: null,
      leaderboard_type: null,
      rank: null,
      prize_tier_id: null,
      type: 'debit',
      amount: payout.amount,
      reason: 'Payout',
    });
    setPendingPayouts(pendingPayouts.filter(p => p.id !== payout.id));
  };

  const handleRejectPayout = async (payout: any) => {
    await supabase.from('payouts').update({ status: 'Rejected', processed_at: new Date().toISOString() }).eq('id', payout.id);
    setPendingPayouts(pendingPayouts.filter(p => p.id !== payout.id));
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesStatus = profileStatus === 'all' || (profile.status || '').toLowerCase() === profileStatus;
    const search = profileSearch.toLowerCase();
    const matchesSearch =
      profile.full_name?.toLowerCase().includes(search) ||
      profile.instagram?.toLowerCase().includes(search) ||
      profile.upi_id?.toLowerCase().includes(search);
    return matchesStatus && (!profileSearch || matchesSearch);
  });

  const handleSendNotification = async () => {
    setNotifSending(true);
    let targets = [];
    if (notifTarget === 'all') {
      targets = profiles.map(p => p.id);
    } else {
      targets = [notifTarget];
    }
    await Promise.all(targets.map(user_id =>
      supabase.from('notifications').insert({
        user_id,
        message: notifMessage,
        type: 'info',
        created_at: new Date().toISOString(),
      })
    ));
    setNotifMessage('');
    setNotifTarget('all');
    setNotifSending(false);
    alert('Notification sent!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-white/90">Manage contests, submissions, and leaderboards</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-purple-600 hover:bg-gray-100">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Contest
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Contest</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Contest Title</label>
                      <Input value={newContest.title} onChange={e => setNewContest({ ...newContest, title: e.target.value })} placeholder="Enter contest title" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Brand Name</label>
                      <Input value={newContest.brand} onChange={e => setNewContest({ ...newContest, brand: e.target.value })} placeholder="Enter brand name" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <Input value={newContest.category} onChange={e => setNewContest({ ...newContest, category: e.target.value })} placeholder="e.g. Lifestyle, Technology, Fitness" />
                  </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <Select value={newContest.status} onValueChange={value => setNewContest({ ...newContest, status: value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Ending Soon">Ending Soon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Banner Image (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="w-full"
                      />
                      {bannerUrl && (
                        <img src={bannerUrl} alt="Banner Preview" className="h-16 w-full object-cover mt-2 rounded" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Brand Logo (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBrandLogoChange}
                        className="w-full"
                      />
                      {brandLogoUrl && (
                        <img src={brandLogoUrl} alt="Logo Preview" className="h-16 w-16 object-contain mt-2 rounded-full bg-white border" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea value={newContest.description} onChange={e => setNewContest({ ...newContest, description: e.target.value })} placeholder="Contest description and rules" rows={4} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Platform</label>
                      <Input value={newContest.platform} onChange={e => setNewContest({ ...newContest, platform: e.target.value })} placeholder="Instagram, YouTube, TikTok..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Engagement Prize (₹)</label>
                      <Input type="number" value={newContest.engagementPrize} onChange={e => setNewContest({ ...newContest, engagementPrize: e.target.value })} placeholder="7000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Creativity Prize (₹)</label>
                      <Input type="number" value={newContest.creativityPrize} onChange={e => setNewContest({ ...newContest, creativityPrize: e.target.value })} placeholder="3000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rules (one per line)</label>
                    <Textarea value={newContest.rules} onChange={e => setNewContest({ ...newContest, rules: e.target.value })} placeholder="Enter each rule on a new line" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Guidelines (one per line)</label>
                    <Textarea value={newContest.guidelines} onChange={e => setNewContest({ ...newContest, guidelines: e.target.value })} placeholder="Enter each guideline on a new line" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Deadline</label>
                    <Input type="date" value={newContest.deadline} onChange={e => setNewContest({ ...newContest, deadline: e.target.value })} />
                  </div>
                  <div className="mt-6">
                    <h3 className="font-semibold mb-1">Prize Tiers</h3>
                    <p className="text-xs text-gray-500 mb-2">Define prizes for each rank or group (e.g. 1st, 2nd, Top 10, etc.) for each leaderboard type.</p>
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 items-center font-semibold text-xs text-gray-700 mb-1">
                        <div className="w-28">Leaderboard</div>
                        <div className="w-28">Rank Label</div>
                        <div className="w-16">Min</div>
                        <div className="w-16">Max</div>
                        <div className="w-20">Prize (₹)</div>
                        <div className="w-8">Action</div>
                      </div>
                      <div className="space-y-2">
                        {prizeTiers.map((tier, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-white/80 rounded">
                            <select value={tier.leaderboard_type} onChange={e => updatePrizeTier(idx, 'leaderboard_type', e.target.value)} className="border rounded px-2 py-1 w-28">
                              <option value="engagement">Engagement</option>
                              <option value="creativity">Creativity</option>
                            </select>
                            <input type="text" value={tier.rank_label} onChange={e => updatePrizeTier(idx, 'rank_label', e.target.value)} placeholder="e.g. 1st, Top 10" className="border rounded px-2 py-1 w-28" />
                            <input type="number" value={tier.rank_min} onChange={e => updatePrizeTier(idx, 'rank_min', Number(e.target.value))} placeholder="Min" className="border rounded px-2 py-1 w-16" />
                            <input type="number" value={tier.rank_max} onChange={e => updatePrizeTier(idx, 'rank_max', Number(e.target.value))} placeholder="Max" className="border rounded px-2 py-1 w-16" />
                            <input type="number" value={tier.prize_amount} onChange={e => updatePrizeTier(idx, 'prize_amount', Number(e.target.value))} placeholder="Prize" className="border rounded px-2 py-1 w-20" />
                            <button type="button" onClick={() => removePrizeTier(idx)} className="text-red-600 font-bold px-2">×</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => addPrizeTier()} className="text-purple-600 font-semibold mt-2">+ Add Prize Tier</button>
                      {/* Prize Pool Total */}
                      <div className="border-t mt-4 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">Total Prize Pool</span>
                          <span className="font-bold text-lg text-purple-700">
                            ₹{prizeTiers.reduce((sum, t) => sum + ((Number(t.rank_max) - Number(t.rank_min) + 1) * (Number(t.prize_amount) || 0)), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          This is the sum of all prize tiers across both leaderboards for this contest.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateContest} disabled={creating}>
                      {creating ? 'Creating...' : 'Create Contest'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 flex-1 w-full">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{contests.length}</div>
              <div className="text-sm text-gray-600">Active Contests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{totalParticipants}</div>
              <div className="text-sm text-gray-600">Total Participants</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Upload className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{pendingReviews}</div>
              <div className="text-sm text-gray-600">Pending Reviews</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">₹{totalPrizePool.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Prize Pool</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="contests" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="contests">Contests</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="engagement">Engagement Board</TabsTrigger>
            <TabsTrigger value="creativity">Creativity Board</TabsTrigger>
            <TabsTrigger value="review">Influencer Review</TabsTrigger>
          </TabsList>

          <TabsContent value="contests">
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                  Contest Management
                </CardTitle>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-purple-600 hover:bg-gray-100">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Contest
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Contest</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Contest Title</label>
                          <Input value={newContest.title} onChange={e => setNewContest({ ...newContest, title: e.target.value })} placeholder="Enter contest title" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Brand Name</label>
                          <Input value={newContest.brand} onChange={e => setNewContest({ ...newContest, brand: e.target.value })} placeholder="Enter brand name" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Category</label>
                          <Input value={newContest.category} onChange={e => setNewContest({ ...newContest, category: e.target.value })} placeholder="e.g. Lifestyle, Technology, Fitness" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Status</label>
                          <Select value={newContest.status} onValueChange={value => setNewContest({ ...newContest, status: value })}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Ending Soon">Ending Soon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Banner Image (optional)</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerChange}
                            className="w-full"
                          />
                          {bannerUrl && (
                            <img src={bannerUrl} alt="Banner Preview" className="h-16 w-full object-cover mt-2 rounded" />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Brand Logo (optional)</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBrandLogoChange}
                            className="w-full"
                          />
                          {brandLogoUrl && (
                            <img src={brandLogoUrl} alt="Logo Preview" className="h-16 w-16 object-contain mt-2 rounded-full bg-white border" />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <Textarea value={newContest.description} onChange={e => setNewContest({ ...newContest, description: e.target.value })} placeholder="Contest description and rules" rows={4} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Platform</label>
                          <Input value={newContest.platform} onChange={e => setNewContest({ ...newContest, platform: e.target.value })} placeholder="Instagram, YouTube, TikTok..." />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Engagement Prize (₹)</label>
                          <Input type="number" value={newContest.engagementPrize} onChange={e => setNewContest({ ...newContest, engagementPrize: e.target.value })} placeholder="7000" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Creativity Prize (₹)</label>
                          <Input type="number" value={newContest.creativityPrize} onChange={e => setNewContest({ ...newContest, creativityPrize: e.target.value })} placeholder="3000" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rules (one per line)</label>
                        <Textarea value={newContest.rules} onChange={e => setNewContest({ ...newContest, rules: e.target.value })} placeholder="Enter each rule on a new line" rows={3} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Guidelines (one per line)</label>
                        <Textarea value={newContest.guidelines} onChange={e => setNewContest({ ...newContest, guidelines: e.target.value })} placeholder="Enter each guideline on a new line" rows={3} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Deadline</label>
                        <Input type="date" value={newContest.deadline} onChange={e => setNewContest({ ...newContest, deadline: e.target.value })} />
                      </div>
                      <div className="mt-6">
                        <h3 className="font-semibold mb-1">Prize Tiers</h3>
                        <p className="text-xs text-gray-500 mb-2">Define prizes for each rank or group (e.g. 1st, 2nd, Top 10, etc.) for each leaderboard type.</p>
                        <div className="overflow-x-auto">
                          <div className="flex gap-2 items-center font-semibold text-xs text-gray-700 mb-1">
                            <div className="w-28">Leaderboard</div>
                            <div className="w-28">Rank Label</div>
                            <div className="w-16">Min</div>
                            <div className="w-16">Max</div>
                            <div className="w-20">Prize (₹)</div>
                            <div className="w-8">Action</div>
                          </div>
                          <div className="space-y-2">
                            {prizeTiers.map((tier, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-white/80 rounded">
                                <select value={tier.leaderboard_type} onChange={e => updatePrizeTier(idx, 'leaderboard_type', e.target.value)} className="border rounded px-2 py-1 w-28">
                                  <option value="engagement">Engagement</option>
                                  <option value="creativity">Creativity</option>
                                </select>
                                <input type="text" value={tier.rank_label} onChange={e => updatePrizeTier(idx, 'rank_label', e.target.value)} placeholder="e.g. 1st, Top 10" className="border rounded px-2 py-1 w-28" />
                                <input type="number" value={tier.rank_min} onChange={e => updatePrizeTier(idx, 'rank_min', Number(e.target.value))} placeholder="Min" className="border rounded px-2 py-1 w-16" />
                                <input type="number" value={tier.rank_max} onChange={e => updatePrizeTier(idx, 'rank_max', Number(e.target.value))} placeholder="Max" className="border rounded px-2 py-1 w-16" />
                                <input type="number" value={tier.prize_amount} onChange={e => updatePrizeTier(idx, 'prize_amount', Number(e.target.value))} placeholder="Prize" className="border rounded px-2 py-1 w-20" />
                                <button type="button" onClick={() => removePrizeTier(idx)} className="text-red-600 font-bold px-2">×</button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => addPrizeTier()} className="text-purple-600 font-semibold mt-2">+ Add Prize Tier</button>
                          {/* Prize Pool Total */}
                          <div className="border-t mt-4 pt-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-700">Total Prize Pool</span>
                              <span className="font-bold text-lg text-purple-700">
                                ₹{prizeTiers.reduce((sum, t) => sum + ((Number(t.rank_max) - Number(t.rank_min) + 1) * (Number(t.prize_amount) || 0)), 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              This is the sum of all prize tiers across both leaderboards for this contest.
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateContest} disabled={creating}>
                          {creating ? 'Creating...' : 'Create Contest'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {contestsLoading ? (
                  <div className="text-gray-500">Loading contests...</div>
                ) : contests.length === 0 ? (
                  <div className="text-gray-500">No contests found.</div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contest Name</TableHead>
                      <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                        <TableHead>Engagement Prize</TableHead>
                        <TableHead>Creativity Prize</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contests.map((contest) => (
                      <TableRow key={contest.id}>
                          <TableCell>{contest.title}</TableCell>
                        <TableCell>{contest.brand}</TableCell>
                          <TableCell>{contest.category ? <Badge variant="outline">{contest.category}</Badge> : '-'}</TableCell>
                          <TableCell><Badge className={contest.platform === 'Instagram' ? 'bg-orange-500' : contest.platform === 'YouTube' ? 'bg-red-500' : 'bg-blue-500'}>{contest.platform}</Badge></TableCell>
                          <TableCell>{contest.status === 'Ending Soon' ? <Badge className="bg-red-500 animate-pulse">Ending Soon!</Badge> : <Badge className="bg-green-500">Active</Badge>}</TableCell>
                          <TableCell>{contest.deadline ? new Date(contest.deadline).toLocaleDateString() : ''}</TableCell>
                          <TableCell>₹{contest.prize_engagement}</TableCell>
                          <TableCell>₹{contest.prize_creativity}</TableCell>
                          <TableCell>{contest.participants || 0}</TableCell>
                        <TableCell>
                            <Button size="sm" className="bg-blue-600 text-white mr-2" onClick={() => handleEditContest(contest)}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" className="bg-red-600 text-white" onClick={() => handleDeleteContest(contest.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-purple-600" />
                  Submission Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-gray-500">Loading submissions...</div>
                ) : submissions.length === 0 ? (
                  <div className="text-gray-500">No submissions found.</div>
                ) : (
                <div className="space-y-6">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="border rounded-lg p-6 mb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{submission.title}</h3>
                            <p className="text-gray-600">{submission.profiles?.full_name || 'Unknown'} ({submission.profiles?.instagram || 'N/A'})</p>
                            <p className="text-sm text-gray-500">{submission.contests?.title || 'Unknown'} • {submission.contests?.platform || 'N/A'}</p>
                        </div>
                        <Badge className={
                          submission.status === 'Approved' ? 'bg-green-500' : 
                          submission.status === 'Pending Review' ? 'bg-yellow-500' : 'bg-red-500'
                        }>
                          {submission.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="font-bold">{submission.likes?.toLocaleString() || 0}</div>
                          <div className="text-xs text-gray-600">Likes</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="font-bold">{submission.comments?.toLocaleString() || 0}</div>
                          <div className="text-xs text-gray-600">Comments</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="font-bold">{submission.shares?.toLocaleString() || 0}</div>
                          <div className="text-xs text-gray-600">Shares</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="font-bold">{submission.views?.toLocaleString() || 0}</div>
                          <div className="text-xs text-gray-600">Views</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="font-bold">{submission.engagement_score?.toLocaleString() || 0}</div>
                          <div className="text-xs text-gray-600">Eng. Score</div>
                        </div>
                      </div>
                      <div className="flex space-x-2 mb-1">
                        <span className="w-20 text-xs text-gray-500">Likes</span>
                        <span className="w-20 text-xs text-gray-500">Comments</span>
                        <span className="w-20 text-xs text-gray-500">Shares</span>
                        <span className="w-20 text-xs text-gray-500">Views</span>
                      </div>
                      <div className="flex space-x-2 mb-2">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-20"
                          value={editEngagement[submission.id]?.likes ?? submission.likes ?? 0}
                          onChange={e =>
                            setEditEngagement(prev => ({
                              ...prev,
                              [submission.id]: {
                                ...prev[submission.id],
                                likes: Number(e.target.value)
                              }
                            }))
                          }
                          placeholder="Likes"
                          aria-label="Likes"
                        />
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-20"
                          value={editEngagement[submission.id]?.comments ?? submission.comments ?? 0}
                          onChange={e =>
                            setEditEngagement(prev => ({
                              ...prev,
                              [submission.id]: {
                                ...prev[submission.id],
                                comments: Number(e.target.value)
                              }
                            }))
                          }
                          placeholder="Comments"
                          aria-label="Comments"
                        />
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-20"
                          value={editEngagement[submission.id]?.shares ?? submission.shares ?? 0}
                          onChange={e =>
                            setEditEngagement(prev => ({
                              ...prev,
                              [submission.id]: {
                                ...prev[submission.id],
                                shares: Number(e.target.value)
                              }
                            }))
                          }
                          placeholder="Shares"
                          aria-label="Shares"
                        />
                        <input
                          type="number"
                          className="border rounded px-2 py-1 w-20"
                          value={editEngagement[submission.id]?.views ?? submission.views ?? 0}
                          onChange={e =>
                            setEditEngagement(prev => ({
                              ...prev,
                              [submission.id]: {
                                ...prev[submission.id],
                                views: Number(e.target.value)
                              }
                            }))
                          }
                          placeholder="Views"
                          aria-label="Views"
                        />
                        <Button size="sm" onClick={() => handleUpdateEngagement(submission.id)}>
                          Update Score
                          </Button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Engagement Leaderboard Management
                  </span>
                  <Select value={selectedContest} onValueChange={setSelectedContest}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select Contest" />
                    </SelectTrigger>
                    <SelectContent>
                      {contests.map((contest) => (
                        <SelectItem key={contest.id} value={contest.id}>
                          {contest.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {engagementLeaderboard.length === 0 ? (
                    <div className="text-gray-500">No leaderboard data found.</div>
                  ) : (
                    engagementLeaderboard.map((entry, idx) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-600'
                        }`}>
                            {idx + 1}
                        </div>
                        <div>
                            <div className="font-medium">{entry.profiles?.full_name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{entry.profiles?.instagram || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="font-bold text-green-600">{entry.engagement_score?.toLocaleString() || 0}</div>
                          <div className="text-sm text-gray-500">Engagement Score</div>
                        </div>
                          {/* Prize info can be added here if you join with prize_tiers */}
                        <Button size="sm" variant="outline">
                          Update Score
                        </Button>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creativity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-blue-600" />
                    Creativity Leaderboard Management
                  </span>
                  <Select value={selectedContest} onValueChange={setSelectedContest}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select Contest" />
                    </SelectTrigger>
                    <SelectContent>
                      {contests.map((contest) => (
                        <SelectItem key={contest.id} value={contest.id}>
                          {contest.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creativityLeaderboard.length === 0 ? (
                    <div className="text-gray-500">No leaderboard data found.</div>
                  ) : (
                    creativityLeaderboard.map((entry, idx) => (
                      <div key={entry.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-600'
                          }`}>
                              {idx + 1}
                          </div>
                          <div>
                              <div className="font-medium">{entry.profiles?.full_name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{entry.profiles?.instagram || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                              <div className="font-bold text-blue-600">{entry.creativity_score || 0}</div>
                            <div className="text-sm text-gray-500">Total Score</div>
                          </div>
                            {/* Prize info can be added here if you join with prize_tiers */}
                          </div>
                        </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Creativity Score</label>
                          <Input
                            type="number"
                            defaultValue={entry.creativity_score || 0}
                            className="text-sm"
                            onChange={e => entry.creativity_score = Number(e.target.value)}
                          />
                        </div>
                        </div>
                      <div className="flex justify-end mt-4">
                        <Button size="sm" onClick={() => handleScoreUpdate(entry.id, 'Creativity', entry.creativity_score)}>
                          Update Score
                        </Button>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  Influencer Profile Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="text-gray-500">Loading profiles...</div>
                ) : profiles.length === 0 ? (
                  <div className="text-gray-500">No pending or rejected profiles.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Instagram</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell>{profile.full_name}</TableCell>
                          <TableCell><a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Instagram</a></TableCell>
                          <TableCell>{profile.phone}</TableCell>
                          <TableCell>
                            <Badge className={profile.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}>{profile.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {profile.status !== 'approved' && (
                              <>
                                <Button size="sm" className="bg-green-600 text-white mr-2" onClick={() => handleApproveProfile(profile.id)}>Approve</Button>
                                <Button size="sm" className="bg-red-600 text-white" onClick={() => handleRejectProfile(profile.id)}>Reject</Button>
                              </>
                            )}
                            {profile.status === 'approved' && (
                              <Badge className="bg-green-600 text-white">Approved</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
                  </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contest</DialogTitle>
          </DialogHeader>
          {editContest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium mb-2">Contest Title</label>
                  <Input value={editContest.title} onChange={e => setEditContest({ ...editContest, title: e.target.value })} />
                </div>
                            <div>
                  <label className="block text-sm font-medium mb-2">Brand Name</label>
                  <Input value={editContest.brand} onChange={e => setEditContest({ ...editContest, brand: e.target.value })} />
                            </div>
                          </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input value={editContest.category} onChange={e => setEditContest({ ...editContest, category: e.target.value })} />
                          </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={editContest.status} onValueChange={value => setEditContest({ ...editContest, status: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Ending Soon">Ending Soon</SelectItem>
                    </SelectContent>
                  </Select>
                        </div>
                    </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Banner Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="w-full"
                  />
                  {(bannerUrl || editContest?.banner_url) && (
                    <img src={bannerUrl || editContest?.banner_url} alt="Banner Preview" className="h-16 w-full object-cover mt-2 rounded" />
                  )}
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-2">Brand Logo (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBrandLogoChange}
                    className="w-full"
                  />
                  {(brandLogoUrl || editContest?.brand_logo_url) && (
                    <img src={brandLogoUrl || editContest?.brand_logo_url} alt="Logo Preview" className="h-16 w-16 object-contain mt-2 rounded-full bg-white border" />
                  )}
                            </div>
                          </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea value={editContest.description} onChange={e => setEditContest({ ...editContest, description: e.target.value })} rows={4} />
                          </div>
              <div className="grid grid-cols-3 gap-4">
                  <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <Input value={editContest.platform} onChange={e => setEditContest({ ...editContest, platform: e.target.value })} />
                        </div>
                            <div>
                  <label className="block text-sm font-medium mb-2">Engagement Prize (₹)</label>
                  <Input type="number" value={editContest.prize_engagement} onChange={e => setEditContest({ ...editContest, prize_engagement: e.target.value })} />
                    </div>
                    <div>
                  <label className="block text-sm font-medium mb-2">Creativity Prize (₹)</label>
                  <Input type="number" value={editContest.prize_creativity} onChange={e => setEditContest({ ...editContest, prize_creativity: e.target.value })} />
                  </div>
                </div>
                    <div>
                <label className="block text-sm font-medium mb-2">Rules (one per line)</label>
                <Textarea value={editContest.rules} onChange={e => setEditContest({ ...editContest, rules: e.target.value })} rows={3} />
                    </div>
                    <div>
                <label className="block text-sm font-medium mb-2">Guidelines (one per line)</label>
                <Textarea value={editContest.guidelines} onChange={e => setEditContest({ ...editContest, guidelines: e.target.value })} rows={3} />
                    </div>
                    <div>
                <label className="block text-sm font-medium mb-2">Deadline</label>
                <Input type="date" value={editContest.deadline} onChange={e => setEditContest({ ...editContest, deadline: e.target.value })} />
                    </div>
                    <div>
                <h3 className="font-semibold mb-1">Prize Tiers</h3>
                <p className="text-xs text-gray-500 mb-2">Define prizes for each rank or group (e.g. 1st, 2nd, Top 10, etc.) for each leaderboard type.</p>
                <div className="overflow-x-auto">
                  <div className="flex gap-2 items-center font-semibold text-xs text-gray-700 mb-1">
                    <div className="w-28">Leaderboard</div>
                    <div className="w-28">Rank Label</div>
                    <div className="w-16">Min</div>
                    <div className="w-16">Max</div>
                    <div className="w-20">Prize (₹)</div>
                    <div className="w-8">Action</div>
                    </div>
                  <div className="space-y-2">
                    {editPrizeTiers.map((tier, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white/80 rounded">
                        <select value={tier.leaderboard_type} onChange={e => updateEditPrizeTier(idx, 'leaderboard_type', e.target.value)} className="border rounded px-2 py-1 w-28">
                          <option value="engagement">Engagement</option>
                          <option value="creativity">Creativity</option>
                        </select>
                        <input type="text" value={tier.rank_label} onChange={e => updateEditPrizeTier(idx, 'rank_label', e.target.value)} placeholder="e.g. 1st, Top 10" className="border rounded px-2 py-1 w-28" />
                        <input type="number" value={tier.rank_min} onChange={e => updateEditPrizeTier(idx, 'rank_min', Number(e.target.value))} placeholder="Min" className="border rounded px-2 py-1 w-16" />
                        <input type="number" value={tier.rank_max} onChange={e => updateEditPrizeTier(idx, 'rank_max', Number(e.target.value))} placeholder="Max" className="border rounded px-2 py-1 w-16" />
                        <input type="number" value={tier.prize_amount} onChange={e => updateEditPrizeTier(idx, 'prize_amount', Number(e.target.value))} placeholder="Prize" className="border rounded px-2 py-1 w-20" />
                        <button type="button" onClick={() => removeEditPrizeTier(idx)} className="text-red-600 font-bold px-2">×</button>
                  </div>
                      ))}
                </div>
                  <button type="button" onClick={() => addEditPrizeTier()} className="text-purple-600 font-semibold mt-2">+ Add Prize Tier</button>
                  {/* Prize Pool Total */}
                  <div className="border-t mt-4 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Total Prize Pool</span>
                      <span className="font-bold text-lg text-purple-700">
                        ₹{editPrizeTiers.reduce((sum, t) => sum + ((Number(t.rank_max) - Number(t.rank_min) + 1) * (Number(t.prize_amount) || 0)), 0).toLocaleString()}
                      </span>
                  </div>
                    <div className="text-xs text-gray-500 mt-1">
                      This is the sum of all prize tiers across both leaderboards for this contest.
                </div>
                    </div>
                    </div>
                    </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditContest(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateContest}>
                  Update Contest
                </Button>
                    </div>
                  </div>
          )}
        </DialogContent>
      </Dialog>

      <Button className="bg-green-600 text-white mb-4" onClick={distributePrizes}>
        Distribute Prizes for Ended Contests
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPayouts.length === 0 ? (
            <div className="text-gray-500">No pending payout requests.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Instagram</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Requested At</th>
                  <th className="text-left p-2">UPI ID</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b">
                    <td className="p-2">{payout.profiles?.full_name || payout.user_id}</td>
                    <td className="p-2">{payout.profiles?.instagram || '-'}</td>
                    <td className="p-2 font-bold text-purple-700">₹{Number(payout.amount).toLocaleString()}</td>
                    <td className="p-2">{payout.requested_at ? new Date(payout.requested_at).toLocaleString() : '-'}</td>
                    <td className="p-2">{payout.profiles?.upi_id || '-'}</td>
                    <td className="p-2 flex gap-2">
                      <Button size="sm" className="bg-green-600 text-white" onClick={() => handleApprovePayout(payout)}>Approve</Button>
                      <Button size="sm" className="bg-red-600 text-white" onClick={() => handleRejectPayout(payout)}>Reject</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
              </CardContent>
            </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Influencer Profiles</CardTitle>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Search by name, Instagram, or UPI ID"
              value={profileSearch}
              onChange={e => setProfileSearch(e.target.value)}
              className="w-64"
            />
            <Select value={profileStatus} onValueChange={setProfileStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
      </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-gray-500">No influencer profiles found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Instagram</th>
                  <th className="text-left p-2">YouTube</th>
                  <th className="text-left p-2">Followers</th>
                  <th className="text-left p-2">UPI ID</th>
                  <th className="text-left p-2">Bio</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="border-b">
                    <td className="p-2">{profile.full_name}</td>
                    <td className="p-2">{profile.instagram}</td>
                    <td className="p-2">{profile.youtube}</td>
                    <td className="p-2">{profile.followers}</td>
                    <td className="p-2">{profile.upi_id || '-'}</td>
                    <td className="p-2">{profile.bio}</td>
                    <td className="p-2">
                      {profile.status === 'approved' ? (
                        <Badge className="bg-green-600 text-white">Approved</Badge>
                      ) : (
                        <>
                          <Button size="sm" className="bg-green-600 text-white mr-2" onClick={() => handleApproveProfile(profile.id)}>Approve</Button>
                          <Button size="sm" className="bg-red-600 text-white" onClick={() => handleRejectProfile(profile.id)}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
              </CardContent>
            </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Send Notification to Influencer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Target Influencer</label>
              <Select value={notifTarget} onValueChange={setNotifTarget}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select influencer or All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Influencers</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>{profile.full_name} ({profile.instagram || profile.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
      </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Message</label>
              <Textarea
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                rows={2}
                placeholder="Enter your custom message..."
              />
            </div>
            <Button
              className="bg-purple-600 text-white"
              onClick={handleSendNotification}
              disabled={notifSending || !notifMessage}
            >
              {notifSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
