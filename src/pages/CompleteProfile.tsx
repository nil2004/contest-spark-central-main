import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CompleteProfile = () => {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setError('');
    setLoading(true);
    // Upload to Supabase Storage
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not found. Please log in again.');
      setLoading(false);
      return;
    }
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) {
      setError('Failed to upload avatar.');
      setLoading(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setAvatarUrl(publicUrlData.publicUrl);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Validate Instagram URL
    if (!instagram || !/^https?:\/\//.test(instagram)) {
      setError('Instagram profile URL is required and must be a valid URL.');
      setLoading(false);
      return;
    }
    // Validate phone
    if (!phone) {
      setError('Phone number is required.');
      setLoading(false);
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      setError('User not found. Please log in again.');
      setLoading(false);
      return;
    }
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      bio,
      avatar_url: avatarUrl,
      instagram,
      youtube,
      phone,
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
    if (upsertError) setError(upsertError.message);
    else navigate('/influencer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Complete Your Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <div>
            <label className="block mb-1 font-medium">Profile Picture (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full"
            />
            {avatarUrl && (
              <img src={avatarUrl} alt="Avatar Preview" className="h-16 w-16 rounded-full mt-2 mx-auto" />
            )}
          </div>
          <textarea
            placeholder="Bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="url"
            placeholder="Instagram Profile URL (required)"
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="text"
            placeholder="Phone Number (required)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="text"
            placeholder="YouTube (optional)"
            value={youtube}
            onChange={e => setYoutube(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-2 rounded-lg" disabled={loading}>
            {loading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile; 