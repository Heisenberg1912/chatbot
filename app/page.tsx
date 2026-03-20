'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  ImagePlus,
  Menu,
  X,
  Plus,
  Building2,
  LayoutGrid,
  Map,
  Package,
  MessageSquare,
  User,
  ChevronDown,
  LogIn,
  LogOut,
  Trash2,
  Sparkles,
  History,
  Sun,
  Moon,
  Image as ImageIcon
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import FloorPlanViewer from './components/FloorPlanViewer';
import AuthModal from './components/AuthModal';
import UpgradeModal from './components/UpgradeModal';
import ChatMarkdown from './components/ChatMarkdown';
import MediaGallery from './components/MediaGallery';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  module?: string;
  metadata?: Record<string, unknown>;
  image?: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  module: string;
  messages: Message[];
  createdAt: Date;
}

const MODULES = [
  { id: 'general', name: 'General Assistant', icon: Sparkles, color: '#e4e4e7', description: 'Ask anything about construction & real estate' },
  { id: 'site-analyzer', name: 'Site Analyzer', icon: Building2, color: '#d4d4d8', description: 'Upload construction images for valuation & analysis' },
  { id: 'floorplan', name: 'Floor Plans', icon: LayoutGrid, color: '#a1a1aa', description: 'Generate 2D floor plans from descriptions' },
  { id: 'masterplan', name: 'Masterplan Explorer', icon: Map, color: '#71717a', description: 'Analyze city masterplans & discover leads' },
  { id: 'materials', name: 'Material Finder', icon: Package, color: '#e4e4e7', description: 'Find suppliers & get material recommendations' },
];

const SUBSCRIPTION_URL = 'https://www.builtattic.com/products/subscription?variant=47204727128299';

const QUICK_ACTIONS = [
  { label: 'Analyze a construction site from an image', module: 'site-analyzer', prompt: '' },
  { label: 'Generate a modern 3BHK floor plan layout', module: 'floorplan', prompt: 'Generate a modern 3BHK apartment floor plan with 1200 sq ft, 2 bathrooms, open kitchen, and a balcony' },
  { label: 'Discover real estate hotspots in Mumbai', module: 'masterplan', prompt: 'Analyze Mumbai real estate market and show me development hotspots' },
  { label: 'Find premium cement suppliers in Delhi', module: 'materials', prompt: 'Find structural material suppliers in Delhi, specifically for cement and steel' },
];

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModule, setSelectedModule] = useState('general');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    subscription?: { plan: string; status: string };
  } | null>(null);
  const [usageInfo, setUsageInfo] = useState<{ freeUsed: number; freeLimit: number; remaining: number; paid: boolean } | null>(null);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showGallery, setShowGallery] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingMessageRef = useRef<{ message: string; module?: string } | null>(null);

  // Helper for authenticated API calls (sends token via header for cross-origin iframe support)
  const authFetch = useCallback((url: string, options?: RequestInit) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers, credentials: 'include' });
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = useCallback(() => {
    authFetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions?.length > 0) {
          setSessions((prev) => {
            const localIds = new Set(prev.map((s) => s.id));
            const dbSessions = data.sessions
              .filter((s: ChatSession) => !localIds.has(s.id))
              .map((s: ChatSession) => ({
                ...s,
                createdAt: new Date(s.createdAt),
                messages: s.messages.map((m: Message) => ({
                  ...m,
                  id: m.id || uuidv4(),
                  timestamp: new Date(m.timestamp),
                })),
              }));
            return [...prev, ...dbSessions];
          });
        }
      })
      .catch(() => {});
  }, [authFetch]);

  useEffect(() => {
    authFetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          loadSessions();
        }
      })
      .catch(() => {});
  }, [loadSessions, authFetch]);

  // Fetch usage info for current module
  const fetchUsage = useCallback(() => {
    const key = user?.email || activeSessionId || '';
    if (!key && !user) return;
    authFetch(`/api/usage?module=${selectedModule}${!user ? `&key=${key}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUsageInfo(data);
      })
      .catch(() => {});
  }, [user, selectedModule, activeSessionId, authFetch]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const createNewSession = useCallback(
    (module?: string) => {
      const id = uuidv4();
      const mod = module || selectedModule;
      const modInfo = MODULES.find((m) => m.id === mod);
      const newSession: ChatSession = {
        id,
        title: `New ${modInfo?.name || 'Chat'}`,
        module: mod,
        messages: [],
        createdAt: new Date(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(id);
      if (module) setSelectedModule(module);
      return id;
    },
    [selectedModule]
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported format. Use JPEG, PNG, WebP, or GIF.');
      return;
    }

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(',')[1]);
      setSelectedModule('site-analyzer');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (overrideMessage?: string, overrideModule?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg && !imageBase64) return;
    if (isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createNewSession(overrideModule);
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: msg || 'Analyze this image',
      module: overrideModule || selectedModule,
      image: imagePreview || undefined,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, userMessage],
              title: s.messages.length === 0 ? msg.slice(0, 40) || 'Image Analysis' : s.title,
            }
          : s
      )
    );

    setInput('');
    setIsLoading(true);

    try {
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sessionId,
          module: overrideModule || selectedModule,
          image: imageBase64 || undefined,
          imageMimeType: imageBase64 ? imageMimeType : undefined,
        }),
      });

      const data = await res.json();

      // Handle auth required
      if (data.requiresAuth) {
        pendingMessageRef.current = { message: msg, module: overrideModule };
        setShowAuthModal(true);
        return;
      }

      // Handle limit reached - redirect to subscription page
      if (data.limitReached) {
        const limitMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: 'You\'ve used all your free messages for this module. Upgrade to Pro for unlimited access.',
          module: data.module,
          metadata: { type: 'limit-reached' },
          timestamp: new Date(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, limitMessage] }
              : s
          )
        );
        fetchUsage();
        window.open(SUBSCRIPTION_URL, '_blank');
        return;
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response || data.error || 'Something went wrong.',
        module: data.module,
        metadata: data.metadata,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, assistantMessage] }
            : s
        )
      );

      if (data.module) setSelectedModule(data.module);
      fetchUsage();
    } catch {
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
      clearImage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId('');
    }
    // Delete from backend for logged-in users
    if (user) {
      authFetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      }).catch(() => {});
    }
  };

  const handleAuth = async (action: 'login' | 'register', data: Record<string, string>) => {
    const res = await fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    const result = await res.json();
    if (result.user) {
      // Store token for cross-origin iframe auth (cookies may be blocked)
      if (result.token) {
        localStorage.setItem('auth-token', result.token);
      }
      setUser(result.user);
      setShowAuthModal(false);
      loadSessions();
      fetchUsage();
      // Re-send the message that triggered the auth modal
      const pending = pendingMessageRef.current;
      if (pending) {
        pendingMessageRef.current = null;
        setTimeout(() => sendMessage(pending.message, pending.module), 300);
      }
    }
    return result;
  };

  const handleLogout = async () => {
    await authFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('auth-token');
    setUser(null);
    setUsageInfo(null);
    setSessions([]);
    setActiveSessionId('');
  };

  const currentModule = MODULES.find((m) => m.id === selectedModule)!;

  // Collect all generated media from chat sessions
  const mediaItems = sessions.flatMap((session) =>
    session.messages
      .filter((msg) => {
        if (msg.role !== 'assistant') return false;
        // Floor plan images
        if (msg.metadata?.type === 'floorplan') {
          const data = msg.metadata.data as Record<string, unknown>;
          return !!data?.floorPlanImage;
        }
        // Any assistant message with embedded images in content
        if (msg.content?.includes('data:image/')) return true;
        return false;
      })
      .map((msg) => {
        if (msg.metadata?.type === 'floorplan') {
          const data = msg.metadata.data as Record<string, unknown>;
          return {
            id: msg.id,
            src: data.floorPlanImage as string,
            title: (data.title as string) || 'Floor Plan',
            module: 'Floor Plans',
            timestamp: msg.timestamp,
          };
        }
        // Extract data:image from content
        const match = msg.content.match(/data:image\/[^)"\s]+/);
        return {
          id: msg.id,
          src: match?.[0] || '',
          title: session.title,
          module: MODULES.find((m) => m.id === msg.module)?.name || 'General',
          timestamp: msg.timestamp,
        };
      })
      .filter((item) => item.src)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-surface text-gray-900 dark:text-content font-sans selection:bg-gray-200 dark:selection:bg-white/20 selection:text-black dark:selection:text-white transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 bg-gray-50 dark:bg-surface-light border-r border-gray-200 dark:border-white/5 flex flex-col overflow-hidden shrink-0 z-30 relative`}
      >
        <div className="p-4 pt-4">
          <button
            onClick={() => createNewSession()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-full bg-white dark:bg-surface-lighter hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium text-gray-900 dark:text-content group border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none"
          >
            <Plus size={18} className="text-gray-500 dark:text-content-muted group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
            <span>New chat</span>
          </button>
        </div>

        {/* Products */}
        <div className="px-4 py-2 overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-content-subtle mb-3 px-2">Products</p>
          <div className="space-y-0.5">
            {[
              { name: 'Floor Plan Generator + MEP & 3D Views', href: 'https://www.builtattic.com/pages/vitruviai' },
              { name: 'Client Leads in your City', href: 'https://www.builtattic.com/pages/faust' },
              { name: 'Construction Management', href: 'https://matters-prod.vercel.app/' },
              { name: 'Shop Architectural Plans', href: 'https://www.builtattic.com/collections/design-studio' },
              { name: 'Hardware & Resource Calculator', href: 'https://www.builtattic.com/pages/vision' },
              { name: 'Hire an Architect', href: 'https://www.builtattic.com/collections/individuals' },
              { name: 'Property Valuation Calculator', href: 'https://www.builtattic.com/pages/valuator' },
              { name: 'Material Supplier in your City', href: 'https://www.builtattic.com/pages/material-studio' },
              { name: 'Timeline & Progress Calculator', href: 'https://www.builtattic.com/pages/summaries-construction-analysis-tool' },
            ].map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-xl text-[13px] text-gray-600 dark:text-content-muted hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-content transition-all leading-snug"
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4 py-4 mt-2 border-t border-gray-200 dark:border-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-content-subtle mb-3 px-2 flex items-center gap-2">
            <History size={12} /> Recent
          </p>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all ${
                  activeSessionId === session.id
                    ? 'bg-gray-200 dark:bg-white/5 text-gray-900 dark:text-content font-medium'
                    : 'text-gray-600 dark:text-content-muted hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-content'
                }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <MessageSquare size={14} className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="px-2 text-xs text-gray-400 dark:text-content-subtle italic">No recent chats</div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 mt-auto border-t border-gray-200 dark:border-white/5">
          {user ? (
            <div className="space-y-3">
              {/* User info row */}
              <div className="flex items-center gap-3 px-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                  user.subscription?.plan === 'pro' || user.subscription?.plan === 'enterprise'
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border border-amber-300 dark:border-amber-500/50'
                    : 'bg-gray-200 dark:bg-surface-lighter text-gray-900 dark:text-white border border-gray-300 dark:border-white/10'
                }`}>
                  {user.name[0].toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-content truncate">{user.name}</span>
                  <span className="text-[11px] text-gray-500 dark:text-content-muted truncate">{user.email}</span>
                </div>
                <button onClick={handleLogout} className="text-gray-400 dark:text-content-subtle hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5" title="Sign out">
                  <LogOut size={15} />
                </button>
              </div>

              {/* Plan card */}
              {usageInfo?.paid ? (
                /* Pro user card */
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-left transition-all hover:border-amber-300 dark:hover:border-amber-500/30 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pro Plan</span>
                    </div>
                    <span className="text-[10px] text-amber-600/60 dark:text-amber-400/50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">View plan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-amber-800/70 dark:text-amber-300/70">
                    <span>Unlimited access</span>
                    <span className="text-amber-400 dark:text-amber-500/50">|</span>
                    <span>{currentModule.name}</span>
                  </div>
                </button>
              ) : (
                /* Free user card with usage */
                <div className="rounded-xl bg-gray-50 dark:bg-surface border border-gray-200 dark:border-white/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-content-muted">Free Plan</span>
                    </div>
                    <a
                      href={SUBSCRIPTION_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/25 transition-colors"
                    >
                      Upgrade
                    </a>
                  </div>

                  {usageInfo && (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-600 dark:text-content-muted">{currentModule.name}</span>
                        <span className={`font-medium ${
                          usageInfo.freeUsed >= usageInfo.freeLimit
                            ? 'text-red-500'
                            : usageInfo.freeUsed >= usageInfo.freeLimit - 1
                            ? 'text-amber-500'
                            : 'text-gray-500 dark:text-content-muted'
                        }`}>
                          {usageInfo.remaining > 0
                            ? `${usageInfo.remaining} left`
                            : 'Limit reached'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            usageInfo.freeUsed >= usageInfo.freeLimit
                              ? 'bg-red-500'
                              : usageInfo.freeUsed >= usageInfo.freeLimit - 1
                              ? 'bg-amber-500'
                              : 'bg-blue-500 dark:bg-blue-400'
                          }`}
                          style={{ width: `${Math.min(100, (usageInfo.freeUsed / usageInfo.freeLimit) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-content-subtle">
                        <span>{usageInfo.freeUsed} used</span>
                        <span>{usageInfo.freeLimit} total</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Not logged in */
            <div className="space-y-2">
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-surface hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm"
              >
                <LogIn size={16} />
                Sign in
              </button>
              <p className="text-[10px] text-center text-gray-400 dark:text-content-subtle">
                Sign in to save history & unlock more features
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-brand-glow-light dark:bg-brand-glow pointer-events-none opacity-40 dark:opacity-60 z-0 mix-blend-screen transition-opacity duration-300" />
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 gap-3 shrink-0 relative z-20 border-b border-transparent">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="font-semibold text-xl tracking-tight flex items-center gap-2 select-none">
              <span className="text-gradient-brand">Builtattic</span>
            </div>
          </div>

          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowGallery(true)}
              className="relative p-2 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5 mr-1"
              aria-label="My Media"
              title="My Media"
            >
              <ImageIcon size={18} />
              {mediaItems.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold px-1 rounded-full bg-amber-500 text-white">
                  {mediaItems.length}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5 mr-1"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setModuleMenuOpen(!moduleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm font-medium text-gray-900 dark:text-content"
            >
              <span>{currentModule.name}</span>
              <ChevronDown size={14} className="text-gray-500 dark:text-content-muted" />
            </button>
            
            {moduleMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-surface-lighter border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl z-50 py-2 animate-fade-in backdrop-blur-xl">
                {MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setSelectedModule(mod.id);
                      setModuleMenuOpen(false);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-left transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 dark:bg-surface border border-gray-200 dark:border-white/5">
                      <mod.icon size={16} className="text-gray-600 dark:text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{mod.name}</div>
                      <div className="text-xs text-gray-500 dark:text-content-muted mt-0.5 leading-snug">{mod.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[80%] px-4 pt-10 pb-8">
              <div className="mb-12 text-center animate-slide-up">
                <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-3">
                  <span className="text-gradient-brand">Hello, {user ? user.name.split(' ')[0] : 'there'}</span>
                </h1>
                <h2 className="text-2xl md:text-3xl text-gray-500 dark:text-content-muted font-normal tracking-wide">
                  How can I help you today?
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl w-full px-4 animate-slide-up-stagger" style={{ animationDelay: '100ms' }}>
                {QUICK_ACTIONS.map((action, i) => {
                  const mod = MODULES.find((m) => m.id === action.module)!;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (action.prompt) {
                          setSelectedModule(action.module);
                          setInput(action.prompt);
                          setTimeout(() => sendMessage(action.prompt, action.module), 150);
                        } else {
                          setSelectedModule(action.module);
                          fileInputRef.current?.click();
                        }
                      }}
                      className="flex flex-col gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-surface-lighter border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all text-left group shadow-sm dark:shadow-none"
                    >
                      <div className="flex items-center gap-2 text-[14px] font-medium text-gray-600 dark:text-content-muted group-hover:text-gray-900 dark:group-hover:text-content transition-colors">
                        <mod.icon size={16} />
                        <span>
                          {action.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 animate-slide-up ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gray-100 dark:bg-surface-lighter text-gray-900 dark:text-content border border-gray-200 dark:border-white/10'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-surface'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      user ? <span className="text-xs font-semibold">{user.name[0].toUpperCase()}</span> : <User size={16} />
                    ) : (
                      <Sparkles size={16} className="text-white dark:text-surface fill-white/20 dark:fill-surface" />
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block max-w-[90%] text-left ${
                        msg.role === 'user'
                          ? 'bg-gray-100 dark:bg-surface-lighter px-5 py-3.5 rounded-3xl rounded-tr-sm text-gray-900 dark:text-content border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none'
                          : 'pt-1.5 text-gray-900 dark:text-content'
                      }`}
                    >
                      {msg.image && (
                        <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 inline-block shadow-sm">
                          <img
                            src={msg.image}
                            alt="Uploaded"
                            className="max-w-xs object-cover"
                          />
                        </div>
                      )}
                      
                      {msg.role === 'assistant' && msg.metadata?.type === 'limit-reached' ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 dark:text-content-muted">{msg.content}</p>
                          <a
                            href={SUBSCRIPTION_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors shadow-sm"
                          >
                            Upgrade to Pro
                          </a>
                        </div>
                      ) : msg.role === 'assistant' ? (
                        <ChatMarkdown content={msg.content} />
                      ) : (
                        <div className="text-[15px] leading-relaxed">
                          {msg.content}
                        </div>
                      )}
                      
                      {/* Interactive components like Floorplan */}
                      {msg.metadata?.type === 'floorplan' && (
                        <div className="mt-5 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg bg-gray-50 dark:bg-surface-lighter">
                          <FloorPlanViewer plan={msg.metadata.data as Record<string, unknown>} />
                        </div>
                      )}
                      
                      {/* Module tag */}
                      {msg.role === 'assistant' && msg.module && msg.module !== 'general' && (
                        <div className="mt-4 flex items-center gap-1">
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-surface-lighter text-gray-600 dark:text-content-muted flex items-center gap-1.5 border border-gray-200 dark:border-white/5">
                            {MODULES.find((m) => m.id === msg.module)?.icon && (() => {
                               const Icon = MODULES.find((m) => m.id === msg.module)!.icon;
                               return <Icon size={12} />;
                            })()}
                            {MODULES.find((m) => m.id === msg.module)?.name || msg.module}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator - Logo Animation */}
              {isLoading && (
                <div className="flex gap-4 animate-slide-up items-center">
                  <div className="shrink-0 mt-1">
                    <svg className="logo-loading-container" width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <rect width="32" height="32" rx="8" className="fill-gray-900 dark:fill-white/10"/>
                      <path d="M8 24V12l8-6 8 6v12H8z" fill="none" className="stroke-gray-400 dark:stroke-white/60 logo-loading-house" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="13" y="18" width="6" height="6" className="fill-gray-400 dark:fill-white/50 logo-loading-door" rx="1"/>
                      <circle cx="16" cy="14" r="2" className="fill-gray-500 dark:fill-white/70 logo-loading-window"/>
                    </svg>
                  </div>
                  <div className="pt-1 px-1">
                    <span className="text-sm text-gray-500 dark:text-content-muted animate-pulse">Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="relative z-20 pb-6 px-4 pt-2 w-full max-w-3xl mx-auto">
          {/* Limit reached banner - blocks input */}
          {usageInfo && !usageInfo.paid && usageInfo.remaining <= 0 ? (
            <div className="rounded-[28px] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 p-5 text-center space-y-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                You&apos;ve used all {usageInfo.freeLimit} free messages for {currentModule.name}.
              </p>
              <a
                href={SUBSCRIPTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Upgrade to Pro for Unlimited Access
              </a>
              <p className="text-[11px] text-amber-600/60 dark:text-amber-400/40">
                Switch to another module to continue using your free messages
              </p>
            </div>
          ) : (
          <>
          {/* Image Preview inside input area top */}
          {imagePreview && (
            <div className="absolute -top-16 left-8 bg-white dark:bg-surface-lighter p-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl animate-fade-in z-30">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-16 rounded-lg object-cover"
                />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-surface border border-gray-200 dark:border-white/10 text-gray-500 dark:text-content-muted hover:text-white dark:hover:text-white hover:bg-red-500 dark:hover:bg-red-500 hover:border-red-500 flex items-center justify-center transition-colors shadow-sm"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="relative group bg-gray-50 dark:bg-surface-lighter rounded-[28px] shadow-sm transition-all duration-300 flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 focus-within:border-gray-300 dark:focus-within:border-white/20 focus-within:bg-white dark:focus-within:bg-[#1c1c1e]">
            <div className="flex items-end gap-2 p-1.5 px-2 relative z-10">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 dark:text-content-muted hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5 transition-colors rounded-full shrink-0 mb-0.5"
                title="Upload an image"
              >
                <ImagePlus size={22} />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedModule === 'site-analyzer'
                    ? 'Upload an image or describe the site'
                    : selectedModule === 'floorplan'
                    ? 'Describe the floor plan you need'
                    : selectedModule === 'masterplan'
                    ? 'Which city masterplan should we explore?'
                    : selectedModule === 'materials'
                    ? 'What materials are you looking for?'
                    : 'Ask anything...'
                }
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none py-3.5 text-[15px] max-h-[200px] text-gray-900 dark:text-content placeholder:text-gray-500 dark:placeholder:text-content-muted font-normal"
                style={{ minHeight: '52px' }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={isLoading || (!input.trim() && !imageBase64)}
                className="p-3 mb-0.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-surface hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-900 dark:disabled:hover:bg-white transition-all shrink-0 shadow-sm"
              >
                {isLoading ? (
                  <svg className="logo-spinner" width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 24V12l8-6 8 6v12H8z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : <Send size={20} className="ml-0.5" />}
              </button>
            </div>
          </div>
          <div className="text-center mt-3">
            <span className="text-[11px] text-gray-500 dark:text-content-subtle font-medium tracking-wide">
              Built on intelligence. Verify critical outputs.
            </span>
          </div>
          </>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onAuth={handleAuth} />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} currentPlan={user?.subscription?.plan || 'free'} />
      )}

      {/* Media Gallery */}
      <MediaGallery
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        localMediaItems={mediaItems}
        isLoggedIn={!!user}
        authFetch={authFetch}
      />
    </div>
  );
}