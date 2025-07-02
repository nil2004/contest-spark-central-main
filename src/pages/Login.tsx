import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else if (data.session) {
      navigate('/influencer');
    } else {
      setInfo('Login successful, but your email is not verified. Please check your inbox and verify your email before logging in.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Influencer Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {info && <div className="text-green-600 text-sm">{info}</div>}
          <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-2 rounded-lg" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className="my-4 text-center text-gray-500">or</div>
        <Button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg flex items-center justify-center gap-2" disabled={loading}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
          Continue with Google
        </Button>
        <div className="mt-6 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-purple-600 hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 