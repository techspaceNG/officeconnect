'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  HardDrive,
  MessageSquare,
  FileText,
  Send,
  ShieldAlert,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Activity,
  User,
  X,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

// Components
import DashboardOverview from '../components/DashboardOverview';
import FileCenter from '../components/FileCenter';
import ChatConsole from '../components/ChatConsole';
import NotesWorkspace from '../components/NotesWorkspace';
import LettersWorkflow from '../components/LettersWorkflow';
import AuditLogs from '../components/AuditLogs';
import Settings from '../components/Settings';

export default function Home() {
  const [user, setUser] = useState<any | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard & Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    filesCount: 0,
    notesCount: 0,
    lettersCount: 0,
    storageUsed: 0,
    storageTotal: 107374182400,
  });
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [pendingLetters, setPendingLetters] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  // Light / Dark Theme State (Default: light)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Check login on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      connectSocket();
      fetchDashboardData(parsed);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      
      connectSocket();
      fetchDashboardData(data.user);
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    disconnectSocket();
  };

  const fetchDashboardData = async (currentUser: any) => {
    try {
      const usage = await apiRequest('/files/usage');
      const notesList = await apiRequest('/notes');
      const lettersList = await apiRequest('/letters');
      const filesList = await apiRequest('/files/folder/contents');

      setStats({
        filesCount: filesList.files.length,
        notesCount: notesList.length,
        lettersCount: lettersList.length,
        storageUsed: usage.usedBytes,
        storageTotal: usage.totalBytes,
      });

      const annList = await apiRequest('/announcements');
      setAnnouncements(annList);

      setPendingLetters(lettersList.filter((l: any) => l.status === 'PENDING_APPROVAL'));
      setRecentFiles(filesList.files.slice(0, 5));
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    }
  };

  const handleApproveLetter = async (id: number) => {
    try {
      await apiRequest(`/letters/${id}/approve`, { method: 'POST' });
      if (user) fetchDashboardData(user);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRejectLetter = async (id: number, reason: string) => {
    try {
      await apiRequest(`/letters/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (user) fetchDashboardData(user);
    } catch (e) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleNotification = () => {
      fetchDashboardData(user);
    };

    socket.on('messageNotification', handleNotification);

    return () => {
      socket.off('messageNotification', handleNotification);
    };
  }, [user]);

  // Global search debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const results = await apiRequest(`/search?q=${searchQuery}`);
          setSearchResults(results);
          setShowSearchModal(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults(null);
        setShowSearchModal(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!user) {
    // macOS Lock Screen Inspired Login Page
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-background p-4 overflow-hidden select-none">
        {/* Soft Ambient Glow backdrop */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="w-full max-w-sm glass-panel rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 border border-border/80">
          {/* macOS window header traffic lights */}
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block"></span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center mx-auto shadow-md border border-border/40">
              <img src="/logo.png" alt="FCET Bichi Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight pt-1">
              OfficeConnect
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">
              ICT Department — FCET Bichi
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            {loginError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium text-center">
                {loginError}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-1">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. admin"
                required
                className="apple-input w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                className="apple-input w-full"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="apple-button w-full py-2.5 font-semibold mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-border/40 text-center space-y-0.5">
            <p className="text-[11px] text-muted-foreground font-medium">
              Powered by <span className="font-bold text-foreground">Techspaceng</span>
            </p>
            <p className="text-[10px] text-muted-foreground/80 font-mono">
              techspace544@gmail.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans select-none overflow-hidden">
      {/* macOS Sidebar Navigation */}
      <aside className="w-64 glass-panel border-r border-border/60 flex flex-col shrink-0 relative z-20">
        {/* macOS Traffic Lights Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block cursor-pointer"></span>
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block cursor-pointer"></span>
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block cursor-pointer"></span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src="/logo.png" alt="Logo" className="w-4 h-4 object-contain" />
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">OfficeConnect</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive size={16} />
            File Center
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare size={16} />
            Internal Chat
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={16} />
            Notes Workspace
          </button>

          <button
            onClick={() => setActiveTab('letters')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'letters'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Send size={16} />
            Correspondence
          </button>

          {(user.role === 'SUPER_ADMIN' || user.role === 'DIRECTOR') && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Admin Console</span>
              </div>

              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'logs'
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldAlert size={16} />
                Audit Logs
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <SettingsIcon size={16} />
                Manage Staff
              </button>
            </>
          )}
        </nav>

        {/* User profile pill */}
        <div className="p-3 border-t border-border/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/40">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <div className="truncate">
                <span className="font-semibold text-xs text-foreground block truncate">{user.fullName}</span>
                <span className="text-[10px] text-muted-foreground block truncate">@{user.username}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all"
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Global Header Bar */}
        <header className="h-14 border-b border-border/40 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          {/* Apple Pill Search Bar */}
          <div className="w-80 relative">
            <Search className="absolute left-3.5 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, chat or notes..."
              className="apple-input w-full pl-9 pr-8 py-1.5 text-xs rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LAN Connected
            </div>
          </div>
        </header>

        {/* Page Content Panel */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Global Search Overlay */}
          {showSearchModal && searchResults && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-30 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
                <h2 className="text-lg font-bold">Search Results for "{searchQuery}"</h2>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchModal(false);
                  }}
                  className="apple-button-secondary text-xs"
                >
                  Close Results
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Files & Folders */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Files & Folders</h3>
                  {searchResults.files.length === 0 && searchResults.folders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No files or folders found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.folders.map((fol: any) => (
                        <div key={fol.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('files'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-xs font-medium truncate">{fol.name} (Folder)</span>
                        </div>
                      ))}
                      {searchResults.files.map((file: any) => (
                        <div key={file.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('files'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer flex items-center justify-between">
                          <span className="text-xs font-medium truncate">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">v{file.versions?.length || 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Notes</h3>
                  {searchResults.notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No notes found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.notes.map((note: any) => (
                        <div key={note.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('notes'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer">
                          <h4 className="text-xs font-semibold">{note.title}</h4>
                          <p className="text-[10px] text-muted-foreground truncate">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Letters */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Correspondence</h3>
                  {searchResults.letters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No letters found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.letters.map((lettr: any) => (
                        <div key={lettr.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('letters'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer">
                          <h4 className="text-xs font-semibold">{lettr.title}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono">{lettr.referenceNumber || 'DRAFT'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="apple-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase border-b border-border/40 pb-2">Chat Messages</h3>
                  {searchResults.messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No chat messages found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {searchResults.messages.map((msg: any) => (
                        <div key={msg.id} onClick={() => { setShowSearchModal(false); setSearchQuery(''); setActiveTab('chat'); }} className="p-2 hover:bg-secondary rounded-lg border border-transparent hover:border-border/60 cursor-pointer">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{msg.sender?.fullName} in #{msg.channel?.name}</span>
                            <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs mt-1 italic">"{msg.content}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Navigation Workspace Panel */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              user={user}
              stats={stats}
              announcements={announcements}
              pendingLetters={pendingLetters}
              recentFiles={recentFiles}
              onNavigate={(tab) => setActiveTab(tab)}
              onApproveLetter={handleApproveLetter}
              onRejectLetter={handleRejectLetter}
            />
          )}

          {activeTab === 'files' && (
            <FileCenter
              user={user}
              onRefreshStats={() => fetchDashboardData(user)}
            />
          )}

          {activeTab === 'chat' && (
            <ChatConsole
              user={user}
            />
          )}

          {activeTab === 'notes' && (
            <NotesWorkspace
              user={user}
              onRefreshStats={() => fetchDashboardData(user)}
            />
          )}

          {activeTab === 'letters' && (
            <LettersWorkflow
              user={user}
              onRefreshStats={() => fetchDashboardData(user)}
            />
          )}

          {activeTab === 'logs' && <AuditLogs />}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}
