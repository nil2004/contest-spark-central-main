import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Trophy, Users, Settings, Menu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isInfluencerPage = location.pathname.startsWith('/influencer');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  function getInitials(email: string) {
    if (!email) return '';
    return email[0].toUpperCase();
  }

  return (
    <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              UtsavAI
            </span>
          </Link>

          {/* MOBILE ONLY: Login/Signup + Hamburger */}
          <div className="flex items-center space-x-2 ml-auto md:hidden">
            {!user && !isInfluencerPage && (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 px-3 py-1">
                    <User className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 border-green-500 text-green-700 hover:bg-green-500 hover:text-white px-3 py-1">
                    <Users className="h-4 w-4" />
                    <span>Signup</span>
                  </Button>
                </Link>
              </>
            )}
            <button
              className="flex items-center p-2 text-purple-600 focus:outline-none"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* DESKTOP ONLY: Nav + Profile/Login/Signup */}
          {!isInfluencerPage && (
            <div className="hidden md:flex items-center space-x-8 ml-auto">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors hover:text-purple-600 ${
                  isActive('/') ? 'text-purple-600' : 'text-gray-700'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/contests" 
                className={`text-sm font-medium transition-colors hover:text-purple-600 ${
                  isActive('/contests') ? 'text-purple-600' : 'text-gray-700'
                }`}
              >
                Live Contests
              </Link>
              <Link 
                to="/leaderboards" 
                className={`text-sm font-medium transition-colors hover:text-purple-600 ${
                  isActive('/leaderboards') ? 'text-purple-600' : 'text-gray-700'
                }`}
              >
                Leaderboards
              </Link>
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border-2 border-purple-200 shadow-sm ${dropdownOpen ? 'bg-purple-50 border-purple-400' : 'bg-white'}`}
                    onClick={() => setDropdownOpen((open) => !open)}
                  >
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {getInitials(user.email)}
                    </span>
                    <span className="hidden sm:inline font-medium text-purple-700">Profile</span>
                    <Menu className="h-4 w-4 ml-1 text-purple-400" />
                  </Button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-fade-in">
                      <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"></div>
                      <div className="flex items-center px-4 py-3 space-x-3 border-b">
                        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                          {getInitials(user.email)}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-800">{user.email}</div>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          onClick={() => {
                            navigate('/influencer');
                            setDropdownOpen(false);
                          }}
                        >
                          Dashboard
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                          onClick={async () => { await supabase.auth.signOut(); setUser(null); setDropdownOpen(false); }}
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Login</span>
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2 border-green-500 text-green-700 hover:bg-green-500 hover:text-white">
                      <Users className="h-4 w-4" />
                      <span>Signup</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        {/* Mobile Nav Dropdown */}
        {!isInfluencerPage && mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-white rounded-xl shadow-lg border border-purple-100 p-4 space-y-2 animate-fade-in">
            <Link 
              to="/" 
              className={`block w-full text-base font-medium py-2 rounded-lg transition-colors ${isActive('/') ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-purple-50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/contests" 
              className={`block w-full text-base font-medium py-2 rounded-lg transition-colors ${isActive('/contests') ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-purple-50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Live Contests
            </Link>
            <Link 
              to="/leaderboards" 
              className={`block w-full text-base font-medium py-2 rounded-lg transition-colors ${isActive('/leaderboards') ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-purple-50'}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Leaderboards
            </Link>
            <div className="flex flex-col gap-2 mt-2">
              {user ? (
                <>
                  <Button className="w-full" onClick={() => { navigate('/influencer'); setMobileMenuOpen(false); }}>Dashboard</Button>
                  <Button className="w-full" variant="destructive" onClick={async () => { await supabase.auth.signOut(); setUser(null); setMobileMenuOpen(false); }}>Logout</Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button className="w-full mb-2" variant="outline" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4 mr-2" /> Login
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="w-full" variant="outline" onClick={() => setMobileMenuOpen(false)}>
                      <Users className="h-4 w-4 mr-2" /> Signup
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
