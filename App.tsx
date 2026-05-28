

import React from 'react';
import { ViewState, Post, AboutConfig, FooterConfig, AppData, ProcessingPost, ProcessingConfig, LicenseConfig, LegalNoticeConfig, CookieBannerConfig, APOD, AstrobinImage, DeepSkyObject, ProcessingLog, WorkflowStep, AcquisitionLogEntry, HeroSlide, ImageEntry, AstronomyData, MappedAstronomyData, AstroForecastHour, EquipmentItem, NightlyForecast } from './types';
import { MessierObject, MESSIER_CATALOG } from './data/messierCatalog';
import { INITIAL_DATA } from './initialData';
import { initializeFirebase, isFirebaseInitialized, login, logout, getAuthInstance, subscribeToSettings, subscribeToCollection, saveSettings, saveCollectionItem, deleteCollectionItem, uploadFile, getDocument, invalidateTokenCache } from './services/api';
import { StarBackground, Button, Input, TextArea, Modal, RichTextEditor, ImageUploader, Lightbox, DraggableListItem, FileUploader, Select, ToggleSwitch, ScrollToTopButton, SocialShare, CookieBanner } from './components/Shared';
import { DEFAULT_EQUIPMENT } from './services/equipmentService';
import {
  Camera, Wind, User, Lock, Plus, Trash2, Edit2, LogOut, Menu, X, Info,
  LayoutDashboard, Newspaper, Sliders, Settings2,
  Calendar as CalendarIcon, Aperture, Telescope, MapPin,
  LayoutTemplate, Upload, Twitter, Facebook, Link as LinkIcon, Settings,
  ZoomIn, Instagram, Youtube, Download, FileJson, Save, Image as ImageIcon,
  Code, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, ShieldCheck,
  Search, GripVertical, Copy, Globe, Database, Key, Moon, Sun,
  RotateCw, MoveUp, SlidersHorizontal, Star, ThumbsUp,
  Smile, Frown, Milestone, AlertCircle, Target, ArrowDown, ArrowUp, Tag, RotateCcw, Maximize2, Minimize2, Zap, File as FileIcon, AudioWaveform, Layers,
  Droplets, Eye, Wind as WindIcon, Cloud, Thermometer, Cloudy, Cookie, FileText, Wrench, CloudMoon, Radio, Mountain, Monitor, EyeOff
} from 'lucide-react';
import { fetchImageOfTheDay } from './services/nasaApiService';
import { fetchAstrobinImageOfTheDay } from './services/astrobinApiService';
import { fetchDsoData } from './services/dsoService';
import { fetchAstroForecast, fetchNightlyForecast } from './services/weatherService';
import { fetchAstronomyData } from './services/astronomyApiService';
import { mapAstronomyData } from './services/astronomyDataMapper';
import { mapAndFilterImagingWindow, mapNightlyForecast } from './services/weatherDataMapper';
// Lazy load heavy views
const GearReviewsView = React.lazy(() => import('./components/GearReviewsView'));
const GearSettingsForm = React.lazy(() => import('./components/GearSettingsForm'));
const EquipmentTrackerForm = React.lazy(() => import('./components/EquipmentTrackerForm'));
const LazyLoginView = React.lazy(() => import('./components/LoginView'));
const NightlyForecastView = React.lazy(() => import('./components/NightlyForecastView'));
const WeatherDisplayView = React.lazy(() => import('./components/WeatherDisplayView'));
const AplsModule2View = React.lazy(() => import('./components/AplsModule2View'));
const AplsModule1View = React.lazy(() => import('./components/AplsModule1View'));
const AplsModule3View = React.lazy(() => import('./components/AplsModule3View'));
const AplsModule4View = React.lazy(() => import('./components/AplsModule4View'));
const AplsModule5View = React.lazy(() => import('./components/AplsModule5View'));
const AplsModule6View = React.lazy(() => import('./components/AplsModule6View'));

const NavButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      active
        ? 'text-text'
        : 'text-text-secondary hover:text-text'
    }`}
  >
    {children}
    {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full"></span>}
  </button>
);

const MobileNavButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="block w-full text-left px-4 py-3 text-base font-semibold text-text hover:bg-surface rounded-md transition-colors"
  >
    {children}
  </button>
);

const AstroDataCard: React.FC<{ icon: React.ReactNode; label: string; value: string; }> = ({ icon, label, value }) => (
  <div className="bg-background border border-border/50 p-4 rounded-lg flex flex-col items-center justify-center text-center gap-2 transition-colors hover:border-primary/50">
    <div className="text-primary">{icon}</div>
    <span className="text-xs text-text-secondary uppercase font-semibold tracking-wider">{label}</span>
    <span className="text-lg font-bold font-mono">{value}</span>
  </div>
);

const DeveloperError: React.FC = () => (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-8">
        <div className="text-center bg-surface border border-border rounded-lg p-8 max-w-lg">
            <h1 className="text-2xl font-display text-red-400 mb-4">Configuration Needed</h1>
            <p className="text-text-secondary">
                The API server is not reachable.
            </p>
            <p className="text-sm mt-4 text-text-secondary">
                Please ensure the AstroCapture API server is running on port 3002.
            </p>
        </div>
    </div>
);

const TargetDetailModal: React.FC<{ target: MessierObject | null; onClose: () => void }> = ({ target, onClose }) => {
  if (!target) return null;
  return (
    <Modal isOpen={!!target} onClose={onClose} title={`${target.messier} ${target.commonName ? `- ${target.commonName}` : ''}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-surface p-3 rounded-lg border border-border">
            <span className="text-text-secondary block text-xs uppercase mb-1">Constellation</span>
            <span className="font-bold text-text">{target.constellation}</span>
          </div>
          <div className="bg-surface p-3 rounded-lg border border-border">
            <span className="text-text-secondary block text-xs uppercase mb-1">Magnitude</span>
            <span className="font-bold text-text">{target.magnitude}</span>
          </div>
          <div className="bg-surface p-3 rounded-lg border border-border">
            <span className="text-text-secondary block text-xs uppercase mb-1">Type</span>
            <span className="font-bold text-text">{target.type}</span>
          </div>
          <div className="bg-surface p-3 rounded-lg border border-border">
            <span className="text-text-secondary block text-xs uppercase mb-1">Distance</span>
            <span className="font-bold text-text">{target.distance} ly</span>
          </div>
          <div className="bg-surface p-3 rounded-lg border border-border">
             <span className="text-text-secondary block text-xs uppercase mb-1">Coordinates</span>
             <span className="font-mono text-xs text-text">{target.ra} / {target.dec}</span>
          </div>
           <div className="bg-surface p-3 rounded-lg border border-border">
             <span className="text-text-secondary block text-xs uppercase mb-1">Size</span>
             <span className="font-bold text-text">{target.size}</span>
          </div>
        </div>

        {target.bestSeason && (
            <div className="bg-surface p-4 rounded-lg border border-border">
                <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">Best Season</h3>
                <p className="text-text">{target.bestSeason}</p>
            </div>
        )}

         {target.difficulty && (
            <div className="bg-surface p-4 rounded-lg border border-border flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-secondary uppercase">Difficulty</h3>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    target.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                    target.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                }`}>
                    {target.difficulty}
                </span>
            </div>
        )}
      </div>
    </Modal>
  );
};

const GlobalSearch: React.FC<{
  posts: Post[];
  processingPosts: ProcessingPost[];
  onNavigate: (type: 'post' | 'processing' | 'target', id: string) => void;
}> = ({ posts, processingPosts, onNavigate }) => {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = React.useMemo(() => {
    if (!query || query.length < 2) return [];
    const lowerQuery = query.toLowerCase();

    const postResults = posts.filter(p =>
      (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
      (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
      (p.tags && p.tags.some(t => t && t.toLowerCase().includes(lowerQuery)))
    ).map(p => ({ type: 'post' as const, item: p }));

    const processingResults = processingPosts.filter(p =>
      (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
      (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
      (p.tags && p.tags.some(t => t && t.toLowerCase().includes(lowerQuery)))
    ).map(p => ({ type: 'processing' as const, item: p }));

    const targetResults = MESSIER_CATALOG.filter(t =>
      (t.messier && t.messier.toLowerCase().includes(lowerQuery)) ||
      (t.ngc && t.ngc.toLowerCase().includes(lowerQuery)) ||
      (t.commonName && t.commonName.toLowerCase().includes(lowerQuery)) ||
      (t.constellation && t.constellation.toLowerCase().includes(lowerQuery))
    ).map(t => ({ type: 'target' as const, item: t }));

    return [...postResults, ...processingResults, ...targetResults].slice(0, 10);
  }, [query, posts, processingPosts]);

  return (
    <div className="relative ml-4 hidden md:block" ref={wrapperRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-surface/50 border border-border rounded-full py-2 pl-10 pr-4 text-sm w-48 focus:w-72 transition-all focus:outline-none focus:border-primary focus:bg-surface text-text placeholder:text-text-secondary/50"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto animate-fade-in">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${(result.item as any).id || (result.item as any).messier}-${index}`}
              className="w-full text-left p-3 hover:bg-background border-b border-border last:border-0 flex items-start gap-3 transition-colors group"
              onClick={() => {
                onNavigate(result.type, (result.item as any).id || (result.item as any).messier);
                setIsOpen(false);
                setQuery('');
              }}
            >
              <div className="mt-1 flex-shrink-0">
                {result.type === 'post' && <ImageIcon size={16} className="text-primary group-hover:scale-110 transition-transform" />}
                {result.type === 'processing' && <SlidersHorizontal size={16} className="text-secondary group-hover:scale-110 transition-transform" />}
                {result.type === 'target' && <Target size={16} className="text-green-400 group-hover:scale-110 transition-transform" />}
              </div>
              <div>
                <p className="font-bold text-sm text-text group-hover:text-primary transition-colors">
                  {(result.item as any).title || (result.item as any).messier + ((result.item as any).commonName ? ` - ${(result.item as any).commonName}` : '')}
                </p>
                <p className="text-xs text-text-secondary line-clamp-1">
                  {(result.item as any).description ? (result.item as any).description.replace(/<[^>]*>?/gm, '') : (result.item as any).constellation}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [view, setView] = React.useState<ViewState>(ViewState.GALLERY);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);

  // Check auth on mount
  React.useEffect(() => {
    const token = localStorage.getItem('astrocapture_token');
    if (token) {
      // Verify token with backend
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
          invalidateTokenCache(); // Ensure the API token cache is fresh
        } else {
          localStorage.removeItem('astrocapture_token');
        }
        setAuthChecked(true);
      })
      .catch(() => {
        localStorage.removeItem('astrocapture_token');
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // State initialization
  const [dbConnected, setDbConnected] = React.useState(false);
  const [showDevError, setShowDevError] = React.useState(false);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [processingPosts, setProcessingPosts] = React.useState<ProcessingPost[]>([]);
  const [processingLogs, setProcessingLogs] = React.useState<ProcessingLog[]>([]);
  const [heroSlides, setHeroSlides] = React.useState<HeroSlide[]>(INITIAL_DATA.heroSlides);
  const [aboutConfig, setAboutConfig] = React.useState<AboutConfig>(INITIAL_DATA.about);
  const [footerConfig, setFooterConfig] = React.useState<FooterConfig>(INITIAL_DATA.footer);
  const [processingConfig, setProcessingConfig] = React.useState<ProcessingConfig>(INITIAL_DATA.processingConfig);
  const [licenseConfig, setLicenseConfig] = React.useState<LicenseConfig>(INITIAL_DATA.license);
  const [legalNoticeConfig, setLegalNoticeConfig] = React.useState<LegalNoticeConfig>(INITIAL_DATA.legalNotice);
  const [cookieBannerConfig, setCookieBannerConfig] = React.useState<CookieBannerConfig>(INITIAL_DATA.cookieBanner);
  const [logoUrl, setLogoUrl] = React.useState<string>(INITIAL_DATA.logoUrl);
  const [faviconUrl, setFaviconUrl] = React.useState<string>(INITIAL_DATA.faviconUrl);
  const [gearItems, setGearItems] = React.useState<EquipmentItem[]>([]);
  const [equipment, setEquipment] = React.useState<AstroEquipment[]>(DEFAULT_EQUIPMENT);

  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [cookieConsent, setCookieConsent] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent !== null) {
      setCookieConsent(consent === 'true');
    }
  }, []);

  const handleCookieAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setCookieConsent(true);
  };

  const handleCookieDecline = () => {
    localStorage.setItem('cookieConsent', 'false');
    setCookieConsent(false);
  };

  // Content specific state
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [selectedProcessingPostId, setSelectedProcessingPostId] = React.useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = React.useState<MessierObject | null>(null);

  // Global state for lightbox
  const [lightboxState, setLightboxState] = React.useState<{ isOpen: boolean; items: { url: string; alt: string }[]; startIndex: number }>({ isOpen: false, items: [], startIndex: 0 });

  // Scroll to top button state
  const [showScrollToTop, setShowScrollToTop] = React.useState(false);

  const openLightbox = (items: { url: string; alt: string }[], startIndex: number = 0) => {
    setLightboxState({ isOpen: true, items, startIndex });
  };
  const closeLightbox = () => {
    setLightboxState({ isOpen: false, items: [], startIndex: 0 });
  };

  React.useEffect(() => {
    // Check API connectivity
    fetch('/api/health').then(r => r.ok ? setDbConnected(true) : setShowDevError(true)).catch(() => setShowDevError(true)).finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    if (!dbConnected) return;
    // Check if already logged in (token exists)
    const token = localStorage.getItem('astrocapture_token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? setIsLoggedIn(true) : (localStorage.removeItem('astrocapture_token'), setIsLoggedIn(false)))
        .catch(() => setIsLoggedIn(false));
    }
  }, [dbConnected]);

  React.useEffect(() => {
    if (!dbConnected) return;
    const subs = [
      subscribeToCollection('posts', (data) => setPosts((data as Post[]).sort((a, b) => new Date(b.captureDate).getTime() - new Date(a.captureDate).getTime()))),
      subscribeToCollection('processingPosts', (data) => setProcessingPosts((data as ProcessingPost[]).sort((a, b) => new Date(b.captureDate).getTime() - new Date(a.captureDate).getTime()))),
      subscribeToCollection('processing_logs', (data) => setProcessingLogs(data as ProcessingLog[])),
      subscribeToCollection('gear', (data) => setGearItems(data as EquipmentItem[])),
      subscribeToCollection('my_equipment', (data) => {
        if (data && data.length > 0) {
          setEquipment(data as AstroEquipment[]);
        }
      }),
      subscribeToSettings('heroSlides', (data) => {
        const slides = data?.slides || INITIAL_DATA.heroSlides;
        if (Array.isArray(slides)) {
            setHeroSlides(slides.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
        } else {
            setHeroSlides(INITIAL_DATA.heroSlides);
        }
      }),
      subscribeToSettings('about', (data) => {
        setAboutConfig({ ...INITIAL_DATA.about, ...(data || {}) });
      }),
      subscribeToSettings('footer', (data) => {
        const mergedData = { ...INITIAL_DATA.footer, ...(data || {}) };
        if (data?.socialLinks) {
          mergedData.socialLinks = { ...INITIAL_DATA.footer.socialLinks, ...data.socialLinks };
        }
        setFooterConfig(mergedData);
      }),
      subscribeToSettings('processing', (data) => {
        setProcessingConfig({ ...INITIAL_DATA.processingConfig, ...(data || {}) });
      }),
      subscribeToSettings('license', (data) => {
        setLicenseConfig({ ...INITIAL_DATA.license, ...(data || {}) });
      }),
      subscribeToSettings('legalNotice', (data) => {
        setLegalNoticeConfig({ ...INITIAL_DATA.legalNotice, ...(data || {}) });
      }),
      subscribeToSettings('cookieBanner', (data) => {
        setCookieBannerConfig({ ...INITIAL_DATA.cookieBanner, ...(data || {}) });
      }),
      subscribeToSettings('global', (data) => {
        setLogoUrl(data?.logoUrl || INITIAL_DATA.logoUrl);
        setFaviconUrl(data?.faviconUrl || INITIAL_DATA.faviconUrl);
      })
    ];
    return () => subs.forEach(unsub => unsub());
  }, [dbConnected]);

  // Listen for data refresh events from save handlers
  React.useEffect(() => {
    const handleRefresh = () => {
      // Force re-subscribe by toggling dbConnected
      setDbConnected(false);
      setTimeout(() => setDbConnected(true), 100);
    };
    window.addEventListener('astrocapture-refresh', handleRefresh);
    return () => window.removeEventListener('astrocapture-refresh', handleRefresh);
  }, []);

  React.useEffect(() => {
    const faviconLink = document.getElementById('favicon-link') as HTMLLinkElement | null;
    if (faviconLink && faviconUrl) {
      faviconLink.href = faviconUrl;
    }

    const ogImageMeta = document.querySelector('meta[property="og:image"]');
    if (ogImageMeta && faviconUrl) {
      ogImageMeta.setAttribute('content', faviconUrl);
    }

    const twitterImageMeta = document.querySelector('meta[property="twitter:image"]');
    if (twitterImageMeta && faviconUrl) {
      twitterImageMeta.setAttribute('content', faviconUrl);
    }
  }, [faviconUrl]);

  React.useEffect(() => {
    const handleScroll = () => {
        if (window.scrollY > 400) {
            setShowScrollToTop(true);
        } else {
            setShowScrollToTop(false);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('astrocapture_token');
    setIsAuthenticated(false);
    logout();
    setView(ViewState.GALLERY);
  };

  const handleNav = (target: ViewState) => {
    if ([ViewState.GALLERY, ViewState.POST_PROCESSING, ViewState.IMAGE_OF_THE_DAY, ViewState.ASTRO_INDEX, ViewState.WALL_OF_IMAGES, ViewState.APLS_MODULE1, ViewState.APLS_MODULE2, ViewState.APLS_MODULE3, ViewState.APLS_MODULE4, ViewState.APLS_MODULE5, ViewState.APLS_MODULE6].includes(target)) {
      setSelectedTag(null);
      setSelectedPostId(null);
      setSelectedProcessingPostId(null);
      setSelectedTarget(null);
    }
    setView(target);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleViewPost = (postId: string) => { setSelectedPostId(postId); setView(ViewState.POST_DETAIL); window.scrollTo(0, 0); };
  const handleViewProcessingPost = (postId: string) => { setSelectedProcessingPostId(postId); setView(ViewState.PROCESSING_POST_DETAIL); window.scrollTo(0, 0); };

  const handleSearchNavigate = (type: 'post' | 'processing' | 'target', id: string) => {
    if (type === 'post') {
      handleViewPost(id);
    } else if (type === 'processing') {
      handleViewProcessingPost(id);
    } else if (type === 'target') {
      const target = MESSIER_CATALOG.find(t => t.messier === id);
      if (target) setSelectedTarget(target);
    }
  };

  const handleBackToGallery = () => { setSelectedPostId(null); setView(ViewState.GALLERY); };
  const handleBackToProcessing = () => { setSelectedProcessingPostId(null); setView(ViewState.POST_PROCESSING); };

  const handleHeroLink = (url: string) => {
    if (!url) return;
    if (url.startsWith('post:')) {
      const postId = url.split(':')[1];
      if (posts.find(p => p.id === postId)) handleViewPost(postId);
    } else if (url.startsWith('processingPost:')) {
      const postId = url.split(':')[1];
      if (processingPosts.find(p => p.id === postId)) handleViewProcessingPost(postId);
    } else if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const pageMap: { [key: string]: ViewState } = {
        'gallery': ViewState.GALLERY, 'articles': ViewState.POST_PROCESSING,
        'image-of-the-day': ViewState.IMAGE_OF_THE_DAY,
        'image-wall': ViewState.WALL_OF_IMAGES,
        'astro-index': ViewState.ASTRO_INDEX,
        'about': ViewState.ABOUT,
        'apls-module1': ViewState.APLS_MODULE1,
        'apls-module2': ViewState.APLS_MODULE2,
        'apls-module3': ViewState.APLS_MODULE3,
        'apls-module4': ViewState.APLS_MODULE4,
        'apls-module5': ViewState.APLS_MODULE5,
        'apls-module6': ViewState.APLS_MODULE6,
      };
      if (pageMap[url.toLowerCase()] !== undefined) handleNav(pageMap[url.toLowerCase()]);
    }
  };

  const handleReset = React.useCallback(async () => {
    if (confirm('Reset all content to defaults? This cannot be undone.')) {
      // Seed via API is handled server-side
      alert('Use the API seed script instead: cd api && npm run seed');
    }
  }, []);


  const selectedPost = posts.find(p => p.id === selectedPostId);
  const selectedProcessingPost = processingPosts.find(p => p.id === selectedProcessingPostId);
  const selectedProcessingLog = processingLogs.find(log => log.parentImageId === selectedPostId);

  const allProcessingPosts = React.useMemo(() => {
    const gearPosts: ProcessingPost[] = gearItems.map(item => ({
      id: `gear-${item.id}`,
      title: item.name,
      description: item.description,
      tags: ['gear', item.category.toLowerCase()],
      captureDate: new Date().toISOString().split('T')[0],
      postType: 'gear-review',
      gearReviewData: item,
      showBeforeOnWall: false,
      showAfterOnWall: false,
      showFeaturedOnWall: false,
    }));
    return [...processingPosts, ...gearPosts];
  }, [processingPosts, gearItems]);

  if (showDevError) return <DeveloperError />;

  return (
    <div className="min-h-screen bg-background text-text font-sans flex flex-col">
      <StarBackground />
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNav(ViewState.GALLERY)}>
              <img src={logoUrl} alt="AstroCapture" className="h-10 w-auto object-contain" />
              <span className="font-display font-bold text-xl text-text hidden sm:block">AstroCapture</span>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <NavButton active={view === ViewState.GALLERY} onClick={() => handleNav(ViewState.GALLERY)}>Home</NavButton>
              <NavButton active={view === ViewState.IMAGE_OF_THE_DAY} onClick={() => handleNav(ViewState.IMAGE_OF_THE_DAY)}>IOTD</NavButton>
              <NavButton active={view === ViewState.WALL_OF_IMAGES} onClick={() => handleNav(ViewState.WALL_OF_IMAGES)}>Image Wall</NavButton>
              <NavButton active={view === ViewState.POST_PROCESSING} onClick={() => handleNav(ViewState.POST_PROCESSING)}>Articles</NavButton>
              <NavButton active={view === ViewState.ASTRO_INDEX} onClick={() => handleNav(ViewState.ASTRO_INDEX)}>Astro Weather</NavButton>
              <NavButton active={view === ViewState.APLS_MODULE2} onClick={() => handleNav(ViewState.APLS_MODULE2)}>Equipment</NavButton>
              <NavButton active={view === ViewState.APLS_MODULE1} onClick={() => handleNav(ViewState.APLS_MODULE1)}>Dashboard</NavButton>
              <NavButton active={view === ViewState.APLS_MODULE3} onClick={() => handleNav(ViewState.APLS_MODULE3)}>Framing</NavButton>
              <NavButton active={view === ViewState.APLS_MODULE4} onClick={() => handleNav(ViewState.APLS_MODULE4)}>Planner</NavButton>
              <NavButton active={view === ViewState.APLS_MODULE5} onClick={() => handleNav(ViewState.APLS_MODULE5)}>Exposure</NavButton>
              <NavButton active={view === ViewState.APLS_MODULE6} onClick={() => handleNav(ViewState.APLS_MODULE6)}>Analysis</NavButton>
              <GlobalSearch posts={posts} processingPosts={processingPosts} onNavigate={handleSearchNavigate} />
            </div>
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-text-secondary hover:text-text p-2 rounded-md">
                {isMobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border animate-fade-in shadow-2xl">
            <div className="px-4 py-6 space-y-2">
              <MobileNavButton onClick={() => handleNav(ViewState.GALLERY)}>Home</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.IMAGE_OF_THE_DAY)}>IOTD</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.WALL_OF_IMAGES)}>Image Wall</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.POST_PROCESSING)}>Articles</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.ASTRO_INDEX)}>Astro Weather</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.APLS_MODULE2)}>Equipment</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.APLS_MODULE1)}>Dashboard</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.APLS_MODULE3)}>Framing</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.APLS_MODULE4)}>Planner</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.APLS_MODULE5)}>Exposure</MobileNavButton>
              <MobileNavButton onClick={() => handleNav(ViewState.APLS_MODULE6)}>Analysis</MobileNavButton>
            </div>
          </div>
        )}
      </nav>
      <main className="flex-grow animate-fade-in pt-20">
        {view === ViewState.GALLERY && <GalleryView posts={posts} heroSlides={heroSlides} onNavigate={handleHeroLink} onViewPost={handleViewPost} selectedTag={selectedTag} setSelectedTag={setSelectedTag} />}
        {view === ViewState.POST_DETAIL && <PostDetailView post={selectedPost} log={selectedProcessingLog} posts={posts} onBack={handleBackToGallery} onSelectTag={(tag) => { setSelectedTag(tag); setView(ViewState.GALLERY); }} onOpenLightbox={openLightbox} onNavigateToPost={(postId) => { setSelectedPostId(postId); window.scrollTo(0, 0); }} />}
        {view === ViewState.POST_PROCESSING && <ProcessingView posts={allProcessingPosts} config={processingConfig} onViewPost={handleViewProcessingPost} selectedTag={selectedTag} setSelectedTag={setSelectedTag} />}
        {view === ViewState.PROCESSING_POST_DETAIL && <ProcessingPostDetailView post={selectedProcessingPost} onBack={handleBackToProcessing} onSelectTag={(tag) => { setSelectedTag(tag); setView(ViewState.POST_PROCESSING); }} onOpenLightbox={openLightbox} />}
        {view === ViewState.IMAGE_OF_THE_DAY && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><ImageOfTheDayView /></div>}
        {view === ViewState.WALL_OF_IMAGES && <ImageWallView posts={posts} processingPosts={processingPosts} onOpenLightbox={openLightbox} />}
        {view === ViewState.GEAR_REVIEWS && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading...</div>}><GearReviewsView items={gearItems} /></React.Suspense>}
        {view === ViewState.ABOUT && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><AboutView config={aboutConfig} /></div>}
        {view === ViewState.ASTRO_INDEX && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><AstroIndexView /></div>}
        {view === ViewState.LOGIN && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading...</div>}><LazyLoginView onLogin={(token) => { setIsAuthenticated(true); setView(ViewState.GALLERY); }} /></React.Suspense>}
        {view === ViewState.LICENSE && <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><LicenseView config={licenseConfig} onBack={() => handleNav(ViewState.GALLERY)} /></div>}
        {view === ViewState.LEGAL_NOTICE && <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><LegalNoticeView config={legalNoticeConfig} onBack={() => handleNav(ViewState.GALLERY)} /></div>}
        {view === ViewState.ADMIN_LOGIN && <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 pt-8"><LazyLoginView onLogin={(token) => { setIsLoggedIn(true); setView(ViewState.ADMIN_DASHBOARD); }} /></div>}
        {view === ViewState.ADMIN_DASHBOARD && isLoggedIn && <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"><AdminDashboard {...{posts, processingPosts, heroSlides, aboutConfig, logoUrl, faviconUrl, footerConfig, processingConfig, licenseConfig, legalNoticeConfig, cookieBannerConfig, gearItems, equipment}} onLogout={handleLogout} onReset={handleReset} /></div>}
        {view === ViewState.APLS_MODULE2 && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading APLS Module 2...</div>}><AplsModule2View /></React.Suspense>}
        {view === ViewState.APLS_MODULE1 && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading APLS Module 1...</div>}><AplsModule1View /></React.Suspense>}
        {view === ViewState.APLS_MODULE3 && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading APLS Module 3...</div>}><AplsModule3View /></React.Suspense>}
        {view === ViewState.APLS_MODULE4 && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading APLS Module 4...</div>}><AplsModule4View /></React.Suspense>}
        {view === ViewState.APLS_MODULE5 && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading APLS Module 5...</div>}><AplsModule5View /></React.Suspense>}
        {view === ViewState.APLS_MODULE6 && <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading APLS Module 6...</div>}><AplsModule6View /></React.Suspense>}
      </main>
      <Footer config={footerConfig} isLoggedIn={isLoggedIn} onNavigateToLicense={() => handleNav(ViewState.LICENSE)} onNavigateToLegalNotice={() => handleNav(ViewState.LEGAL_NOTICE)} onNavigateToAdmin={() => handleNav(isLoggedIn ? ViewState.ADMIN_DASHBOARD : ViewState.ADMIN_LOGIN)} onNavigateToAbout={() => handleNav(ViewState.ABOUT)} />
      <Lightbox isOpen={lightboxState.isOpen} onClose={closeLightbox} items={lightboxState.items} startIndex={lightboxState.startIndex} />
      <TargetDetailModal target={selectedTarget} onClose={() => setSelectedTarget(null)} />
      <ScrollToTopButton isVisible={showScrollToTop} onClick={handleScrollToTop} />
      {cookieConsent === null && cookieBannerConfig.enabled && (
        <CookieBanner
          config={cookieBannerConfig}
          onAccept={handleCookieAccept}
          onDecline={handleCookieDecline}
        />
      )}
    </div>
  );
};

const Footer: React.FC<{ config: FooterConfig, isLoggedIn: boolean, onNavigateToLicense: () => void, onNavigateToLegalNotice: () => void, onNavigateToAdmin: () => void, onNavigateToAbout: () => void }> = ({ config, isLoggedIn, onNavigateToLicense, onNavigateToLegalNotice, onNavigateToAdmin, onNavigateToAbout }) => (
  <footer className="mt-16 bg-surface border-t border-border py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h3 className="font-display font-bold text-lg mb-2 text-text">AstroCapture</h3>
          <p className="text-sm text-text-secondary max-w-xl">{config.text}</p>
        </div>
        <div className="flex gap-2">
          {config.socialLinks.instagram && (<a href={config.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md text-text-secondary hover:text-text hover:bg-border transition-colors"><Instagram size={20} /></a>)}
          {config.socialLinks.twitter && (<a href={config.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md text-text-secondary hover:text-text hover:bg-border transition-colors"><Twitter size={20} /></a>)}
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-text-secondary/50">System Status: Operational // v4.2.0</p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={onNavigateToAbout} className="text-sm text-text-secondary hover:text-primary">About</button>
          <button onClick={onNavigateToLicense} className="text-sm text-text-secondary hover:text-primary">License</button>
          <button onClick={onNavigateToLegalNotice} className="text-sm text-text-secondary hover:text-primary">Legal Notice</button>
          <button onClick={onNavigateToAdmin} className="text-sm text-text-secondary hover:text-primary">{isLoggedIn ? 'Dashboard' : 'Admin'}</button>
        </div>
      </div>
    </div>
  </footer>
);

const HeroSlider: React.FC<{ slides: HeroSlide[], onNavigate: (url: string) => void }> = ({ slides, onNavigate }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % slides.length), 7000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  if (!slides || slides.length === 0) return null;

  return (
    <section className="relative h-[80vh] w-full text-white overflow-hidden group">
      {/* Container for the images */}
      <div className="h-full w-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: index === currentIndex ? 1 : 0,
              zIndex: index === currentIndex ? 10 : 5,
            }}
            aria-hidden={index !== currentIndex}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              onError={(e) => {
                console.error('Hero image failed to load:', slide.imageUrl);
                // Fallback: try to reload with .jpg extension
                if (slide.imageUrl.endsWith('.webp')) {
                  const jpgUrl = slide.imageUrl.replace('.webp', '.jpg');
                  (e.target as HTMLImageElement).src = jpgUrl;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-70"></div>
          </div>
        ))}
      </div>

      {/* Text overlay and controls, with higher z-index */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center p-4 pointer-events-none">
        <div className="p-8 md:p-12 bg-black/30 backdrop-blur-md rounded-xl max-w-3xl border border-white/10 flex flex-col items-center pointer-events-auto">
          {/* Wrapper with key to trigger fade-in animation on content change */}
          <div key={currentIndex} className="animate-fade-in w-full">
            <span className="inline-block py-1 px-3 border border-primary text-primary text-sm font-semibold uppercase tracking-widest mb-4 rounded-full">{slides[currentIndex].subtitle}</span>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold leading-tight mb-4 drop-shadow-lg">{slides[currentIndex].title}</h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-6 whitespace-normal leading-relaxed drop-shadow-md">{slides[currentIndex].description}</p>
            {slides[currentIndex].linkText && slides[currentIndex].linkUrl && (
              <Button onClick={() => onNavigate(slides[currentIndex].linkUrl)} className="!text-lg w-fit mx-auto">
                {slides[currentIndex].linkText} <ChevronRight size={20}/>
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrentIndex(i)} className={`h-2 rounded-full transition-all ${currentIndex === i ? 'bg-primary w-6' : 'bg-white/30 w-2'}`}></button>
        ))}
      </div>
    </section>
  );
};

const GalleryView: React.FC<{ posts: Post[]; heroSlides: HeroSlide[]; onNavigate: (url: string) => void; onViewPost: (postId: string) => void; selectedTag: string | null; setSelectedTag: (tag: string | null) => void; }> = ({ posts, heroSlides, onNavigate, onViewPost, selectedTag, setSelectedTag }) => {
  const uniqueTags = Array.from(new Set(posts.flatMap(p => p.tags))).sort();
  const filteredPosts = selectedTag ? posts.filter(p => p.tags.includes(selectedTag)) : posts;

  return (
    <div className="space-y-8 pb-12">
      <HeroSlider slides={heroSlides} onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-border pb-6 gap-6">
          <div>
            <h2 className="text-3xl font-display font-bold">The Gallery</h2>
            <p className="text-text-secondary mt-1">Explore captured deep sky objects.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedTag(null)} className={`px-3 py-1 text-sm rounded-full transition-colors ${!selectedTag ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:bg-border hover:text-text'}`}>All</button>
            {uniqueTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? null : tag)} className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${selectedTag === tag ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:bg-border hover:text-text'}`}>{tag}</button>
            ))}
          </div>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <article key={post.id} className="group bg-surface border border-border rounded-lg overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-lg" onClick={() => onViewPost(post.id)}>
              <div className="aspect-[4/5] overflow-hidden relative">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading={index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  width="600"
                  height="750"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs capitalize font-bold bg-primary text-white px-2 py-1 rounded shadow-md">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="absolute bottom-0 left-0 p-4">
                  <span className="text-sm font-semibold bg-black/50 text-white px-2 py-1 rounded-full border border-white/20 backdrop-blur-sm">{post.objectName}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-xl font-display font-bold leading-tight mb-2 truncate text-text">{post.title}</h3>
                <p className="text-sm text-text-secondary font-mono">{post.captureDate} // {Math.round(post.totalIntegrationTime / 60)}h Total</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

const PostDetailView: React.FC<{ post: Post | undefined, log: ProcessingLog | undefined, posts: Post[], onBack: () => void, onSelectTag: (tag: string) => void, onOpenLightbox: (items: { url: string; alt: string }[], startIndex?: number) => void, onNavigateToPost: (postId: string) => void }> = ({ post, log, posts, onBack, onSelectTag, onOpenLightbox, onNavigateToPost }) => {
  const [dsoData, setDsoData] = React.useState<DeepSkyObject | null>(null);
  const [isDsoLoading, setIsDsoLoading] = React.useState(true);

  React.useEffect(() => {
    if (post?.objectName) {
        setIsDsoLoading(true);
        fetchDsoData(post.objectName)
            .then(data => setDsoData(data))
            .catch(err => console.error(err))
            .finally(() => setIsDsoLoading(false));
    }
  }, [post?.objectName]);

  const formatIntegrationTime = (minutes: number) => {
    if (!minutes || minutes <= 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (remainingMinutes > 0) result += `${remainingMinutes}m`;
    return result.trim() || '0m';
  };

  const formatAge = (age: number | null, unit: string | null) => {
    if (!age || !unit) return 'N/A';
    const formattedAge = new Intl.NumberFormat().format(age);
    return `${formattedAge} ${unit}`;
  };

  if (!post) return <div className="text-center py-20"><h2 className="text-3xl font-display font-bold">Post Not Found</h2><Button onClick={onBack} variant="secondary" className="mt-6">Back to Gallery</Button></div>;

  const currentIndex = posts.findIndex(p => p.id === post.id);
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  return (
    <article className="pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <Button onClick={onBack} variant="secondary" className="!text-sm"><ChevronLeft size={16} /> Back to Gallery</Button>
        <div className="flex-1"></div>
        {prevPost && (
          <Button onClick={() => onNavigateToPost(prevPost.id)} variant="secondary" className="!text-sm"><ChevronLeft size={16} /> Previous</Button>
        )}
        {nextPost && (
          <Button onClick={() => onNavigateToPost(nextPost.id)} variant="secondary" className="!text-sm">Next <ChevronRight size={16} /></Button>
        )}
      </div>
      <div className="border-b border-border pb-4 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-display font-extrabold">{post.title}</h1>
          <p className="font-mono text-sm mt-2 text-text-secondary uppercase">Captured: {post.captureDate}</p>
          <div className="flex flex-wrap gap-2 pt-4">
              {post.tags.map(tag => (
                <button key={tag} onClick={() => onSelectTag(tag)} className="px-3 py-1 text-sm font-medium rounded-full transition-colors capitalize bg-primary/10 border border-primary/20 text-primary/80 hover:bg-primary/20 hover:text-primary">
                  #{tag}
                </button>
              ))}
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="text-xs font-mono text-text-secondary uppercase">Share</span>
          <SocialShare url={window.location.href} title={post.title} image={post.imageUrl} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3">
          <div className="overflow-hidden relative group cursor-pointer rounded-lg shadow-2xl" onClick={() => onOpenLightbox([{ url: post.imageUrl, alt: post.title }])}>
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full object-cover rounded-lg"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="p-2 bg-black/50 text-white rounded-full"><ZoomIn size={24} /></div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-8">
            <section className="bg-surface border border-border rounded-lg p-6">
                <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4"><Info size={16}/> Object Identity</h2>
                {isDsoLoading ? <div className="animate-pulse text-text-secondary">Retrieving catalog data...</div> : dsoData ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div><span className="text-text-secondary block text-sm">Type</span><span className="font-bold">{dsoData.objectType || 'N/A'}</span></div>
                            <div><span className="text-text-secondary block text-sm">Constellation</span><span className="font-bold">{dsoData.constellation || 'N/A'}</span></div>
                            <div><span className="text-text-secondary block text-sm">RA</span><span className="font-bold font-mono text-sm">{dsoData.rightAscension || 'N/A'}</span></div>
                            <div><span className="text-text-secondary block text-sm">Dec</span><span className="font-bold font-mono text-sm">{dsoData.declination || 'N/A'}</span></div>
                            <div><span className="text-text-secondary block text-sm">Magnitude</span><span className="font-bold">{dsoData.magnitude ?? 'N/A'}</span></div>
                            <div><span className="text-text-secondary block text-sm">Distance</span><span className="font-bold">{dsoData.distance ? `${dsoData.distance.toLocaleString()} ly` : 'N/A'}</span></div>
                            {dsoData.age && <div><span className="text-text-secondary block text-sm">Age</span><span className="font-bold">{formatAge(dsoData.age, dsoData.ageUnit)}</span></div>}
                        </div>

                        {dsoData.catalogDenominations && dsoData.catalogDenominations.length > 0 && (
                            <div className="border-t border-border pt-3">
                                <span className="text-text-secondary block text-sm mb-2">Other Designations</span>
                                <div className="flex flex-wrap gap-2">
                                    {dsoData.catalogDenominations.map(name => (
                                        <span key={name} className="px-2 py-0.5 text-sm font-mono bg-background border border-border rounded-full text-text-secondary">{name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ): <p className="text-sm text-text-secondary">No catalog data available.</p>}
            </section>

            <div className="prose-styles text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: post.description }}></div>
        </div>
      </div>

      {/* Aladin Lite Sky Map - Full Width */}
      {dsoData?.rightAscension && dsoData?.declination ? (
        <section className="mt-8 bg-surface border border-border rounded-lg p-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-2"><Globe size={16}/> Sky Map</h2>
          <AladinLiteViewer
            key={`${dsoData.rightAscension}-${dsoData.declination}`}
            ra={dsoData.rightAscension}
            dec={dsoData.declination}
            fov={2.0}
            name={post.objectName || post.title}
          />
        </section>
      ) : isDsoLoading ? (
        <div className="mt-8 text-center text-text-secondary animate-pulse">Loading sky map...</div>
      ) : null}

      <div className="mt-12 pt-8 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <section className="bg-surface border border-border rounded-lg p-6 h-full">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4"><Telescope size={16}/> Capture Details</h2>
                    <div className="space-y-6">
                        <div className="font-mono space-y-2">
                            <div className="flex justify-between border-b border-border pb-2 gap-4"><span className="text-text-secondary flex-shrink-0">Equipment</span><span className="font-bold text-right truncate text-sm">{post.equipment}</span></div>
                            <div className="flex justify-between border-b border-border pt-1 pb-2"><span className="text-text-secondary">Total Integration</span><span className="font-bold text-sm">{formatIntegrationTime(post.totalIntegrationTime)}</span></div>
                        </div>

                        {post.acquisitionLogs && post.acquisitionLogs.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm font-mono">
                            <thead className="text-text-secondary uppercase">
                                <tr>
                                <th className="p-2 font-semibold">Date</th>
                                <th className="p-2 font-semibold">Filter</th>
                                <th className="p-2 font-semibold text-right">Frames</th>
                                <th className="p-2 font-semibold text-right">Length</th>
                                <th className="p-2 font-semibold text-right">Sub-Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {post.acquisitionLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="p-2 whitespace-nowrap">{log.date}</td>
                                    <td className="p-2">{log.filter}</td>
                                    <td className="p-2 text-right">{log.exposureCount}</td>
                                    <td className="p-2 text-right">{log.exposureLength}s</td>
                                    <td className="p-2 text-right font-bold whitespace-nowrap">
                                    {formatIntegrationTime((log.exposureCount * log.exposureLength) / 60)}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                </section>
            </div>
            <div className="md:col-span-1">
                <div className="bg-surface border border-border rounded-lg p-6 h-full">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4"><LinkIcon size={16}/> Links & Resources</h2>
                    <div className="flex flex-col gap-4">
                        {post.astrobinUrl && (
                        <Button onClick={() => window.open(post.astrobinUrl, '_blank', 'noopener,noreferrer')} variant="primary" className="w-full">
                            <img src="https://www.astrobin.com/static/astrobin/images/favicon-16x16.png?v=73e861d" alt="" className="w-4 h-4" /> View on Astrobin <ExternalLink size={16} />
                        </Button>
                        )}
                        {post.rawDataUrl && (
                        <Button onClick={() => window.open(post.rawDataUrl, '_blank', 'noopener,noreferrer')} variant="primary" className="w-full">
                            <Download size={16} /> Download Raw Data <ExternalLink size={16} />
                        </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {log && <ProcessingLogView log={log} onOpenLightbox={onOpenLightbox} />}
    </article>
  );
};

const ProcessingLogView: React.FC<{ log: ProcessingLog, onOpenLightbox: (items: { url: string; alt: string }[], startIndex?: number) => void }> = ({ log, onOpenLightbox }) => {
  const sortedSteps = log.workflowSteps.sort((a, b) => a.stepOrder - b.stepOrder);
  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-3xl font-display font-bold mb-6 flex items-center gap-3"><SlidersHorizontal size={24} /> Processing Workflow</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 font-mono text-sm">
        <div className="bg-surface border border-border p-4 rounded-lg"><span className="text-text-secondary block">Total Time</span><span className="font-bold text-lg">{log.totalIntegrationTime}</span></div>
        <div className="bg-surface border border-border p-4 rounded-lg"><span className="text-text-secondary block">Bortle Scale</span><span className="font-bold text-lg">{log.bortleScale}</span></div>
        <div className="bg-surface border border-border p-4 rounded-lg"><span className="text-text-secondary block">Software</span><span className="font-bold text-base truncate">{log.softwareUsed.join(', ')}</span></div>
      </div>
      <div className="space-y-6">
        {sortedSteps.map(step => (
          <div key={step.stepId} className="flex flex-col md:flex-row gap-6 p-4 bg-surface border border-border rounded-lg">
            <div className="flex-shrink-0 flex items-center gap-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border text-primary font-bold font-display text-lg">{step.stepOrder}</span>
              {step.screenshotUrl && (
                <img
                  src={step.screenshotUrl}
                  alt={`Screenshot for ${step.toolName}`}
                  className="w-40 h-24 object-cover rounded-md border border-border cursor-pointer hover:border-primary transition"
                  onClick={() => onOpenLightbox([{ url: step.screenshotUrl!, alt: `Screenshot for ${step.toolName}` }])}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
            <div className="flex-grow">
              <h3 className="font-bold font-display text-lg">{step.toolName}</h3>
              <p className="text-text-secondary text-sm mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ProcessingView: React.FC<{ posts: ProcessingPost[], config: ProcessingConfig, onViewPost: (id: string) => void, selectedTag: string | null, setSelectedTag: (tag: string | null) => void }> = ({ posts, config, onViewPost, selectedTag, setSelectedTag }) => {
  const uniqueTags = Array.from(new Set(posts.flatMap(p => p.tags))).sort();
  const filteredPosts = selectedTag ? posts.filter(p => p.tags.includes(selectedTag)) : posts;

  const getPostTypeLabel = (type: string) => {
      switch (type) {
          case 'before-after': return 'Before & After';
          case 'research': return 'Research';
          case 'gallery': return 'Gallery';
          case 'gear-review': return 'Gear Review';
          default: return 'Article';
      }
  };

  const getPostThumbnail = (post: ProcessingPost) => {
      switch (post.postType) {
          case 'before-after': return post.afterImageUrl;
          case 'research': return post.featuredImageUrl;
          case 'gallery': return post.galleryImages?.[0]?.imageUrl;
          case 'gear-review': return post.gearReviewData?.imageUrl;
          default: return '';
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <header className="py-8 text-center border-b border-border mb-8">
            <h1 className="text-4xl font-display font-bold">{config.title}</h1>
            <p className="mt-2 text-text-secondary max-w-2xl mx-auto">{config.subtitle}</p>
        </header>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button onClick={() => setSelectedTag(null)} className={`px-3 py-1 text-sm rounded-full transition-colors ${!selectedTag ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:bg-border hover:text-text'}`}>All</button>
            {uniqueTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? null : tag)} className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${selectedTag === tag ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:bg-border hover:text-text'}`}>{tag}</button>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
                <article key={post.id} className="group bg-surface border border-border rounded-lg overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-lg" onClick={() => onViewPost(post.id)}>
                    <div className="aspect-video overflow-hidden relative">
                        <img
                          src={getPostThumbnail(post)}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading={index < 3 ? 'eager' : 'lazy'}
                          decoding="async"
                        />
                         {post.postType === 'gallery' && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                                <Layers size={16} />
                            </div>
                        )}
                        {post.postType === 'gear-review' && post.gearReviewData && (
                            <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1">
                                <Star size={12} fill="currentColor" className="text-yellow-400" />
                                <span className="text-xs font-bold text-white">{post.gearReviewData.rating.toFixed(1)}</span>
                            </div>
                        )}
                    </div>
                    <div className="p-4 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs uppercase font-bold text-primary">{getPostTypeLabel(post.postType)}</span>
                            {post.captureDate && (
                                <span className="text-xs text-text-secondary flex items-center gap-1">
                                    <CalendarIcon size={12} />
                                    {new Date(post.captureDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-display font-bold leading-tight mb-2 truncate text-text">{post.title}</h3>
                        <div className="flex flex-wrap gap-1 mt-auto">
                            {post.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="text-xs capitalize font-bold bg-primary text-white px-2 py-1 rounded shadow-md">{tag}</span>
                            ))}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    </div>
  );
};

const ImageComparisonSlider: React.FC<{ beforeImageUrl: string; afterImageUrl: string; title: string }> = ({ beforeImageUrl, afterImageUrl, title }) => {
  const [sliderPosition, setSliderPosition] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  const handleMove = React.useCallback((clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let newPosition = (x / rect.width) * 100;

    if (newPosition < 0) newPosition = 0;
    if (newPosition > 100) newPosition = 100;

    setSliderPosition(newPosition);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
  };

  const stopDragging = React.useCallback(() => {
    isDragging.current = false;
  }, []);

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', stopDragging);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [handleMove, stopDragging]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video select-none overflow-hidden rounded-lg group">
      <img
        src={afterImageUrl}
        alt={`After processing: ${title}`}
        className="block w-full h-full object-cover"
        decoding="async"
        fetchPriority="high"
      />

      <div
        className="absolute top-0 left-0 h-full w-full max-w-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImageUrl}
          alt={`Before processing: ${title}`}
          className="block absolute top-0 left-0 w-full h-full object-cover"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white transition-colors z-10"
        style={{ left: `calc(${sliderPosition}% - 0.5px)` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border-2 border-white flex items-center justify-center shadow-lg cursor-ew-resize group-hover:opacity-100 opacity-0 transition-opacity">
          <svg className="w-4 h-4 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-4-4v8m-4 4h8m-4 4v-8"></path></svg>
        </div>
      </div>

      <div className="absolute top-3 left-3 bg-black/50 text-white text-xs uppercase font-bold px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm pointer-events-none z-20">Before</div>
      <div className="absolute top-3 right-3 bg-black/50 text-white text-xs uppercase font-bold px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm pointer-events-none z-20">After</div>
    </div>
  );
};

const ProcessingPostDetailView: React.FC<{ post: ProcessingPost | undefined, onBack: () => void, onSelectTag: (tag: string) => void, onOpenLightbox: (items: { url: string; alt: string }[], startIndex?: number) => void }> = ({ post, onBack, onSelectTag, onOpenLightbox }) => {
    if (!post) return <div className="text-center py-20"><h2 className="text-3xl font-display font-bold">Post Not Found</h2><Button onClick={onBack} variant="secondary" className="mt-6">Back to Gallery</Button></div>;

    const getPostTypeLabel = (type: string) => {
        switch (type) {
            case 'before-after': return 'Before & After';
            case 'research': return 'Research Article';
            case 'gallery': return 'Image Gallery';
            default: return 'Article';
        }
    };

    return (
        <article className="pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button onClick={onBack} variant="secondary" className="mb-8 !text-sm"><ChevronLeft size={16} /> Back to Articles</Button>
            <div className="border-b border-border pb-4 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <span className="font-mono text-sm uppercase text-primary font-semibold">{getPostTypeLabel(post.postType)}</span>
                    <h1 className="text-4xl md:text-5xl font-display font-extrabold mt-1">{post.title}</h1>
                    <p className="font-mono text-sm mt-2 text-text-secondary uppercase">Published: {post.captureDate}</p>
                    <div className="flex flex-wrap gap-2 pt-4">
                        {post.tags.map(tag => (
                        <button key={tag} onClick={() => onSelectTag(tag)} className="px-3 py-1 text-sm font-medium rounded-full transition-colors capitalize bg-primary/10 border border-primary/20 text-primary/80 hover:bg-primary/20 hover:text-primary">
                            #{tag}
                        </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                    <span className="text-xs font-mono text-text-secondary uppercase">Share this article</span>
                    <SocialShare url={window.location.href} title={post.title} />
                </div>
            </div>

            {post.postType === 'before-after' && post.beforeImageUrl && post.afterImageUrl && (
                <div className="mb-8 shadow-2xl">
                    <ImageComparisonSlider beforeImageUrl={post.beforeImageUrl} afterImageUrl={post.afterImageUrl} title={post.title} />
                </div>
            )}

            {post.postType === 'research' && post.featuredImageUrl && (
                <img
                  src={post.featuredImageUrl}
                  alt={post.title}
                  className="w-full rounded-lg mb-8 shadow-2xl"
                  decoding="async"
                  fetchPriority="high"
                />
            )}

            <div className="prose-styles text-text-secondary leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: post.description }}></div>

            {post.postType === 'gallery' && post.galleryImages && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {post.galleryImages.map((image, index) => (
                        <div
                            key={image.id}
                            className="group cursor-pointer flex flex-col"
                            onClick={() => onOpenLightbox(post.galleryImages!.map(img => ({url: img.imageUrl, alt: img.caption})), index)}
                        >
                            <div className="overflow-hidden rounded-lg shadow-lg border border-border">
                               <img
                                 src={image.imageUrl}
                                 alt={image.caption || post.title}
                                 className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
                                 loading="lazy"
                                 decoding="async"
                               />
                            </div>
                            <p className="text-sm text-text-secondary mt-2 text-center italic min-h-[2.5rem]">{image.caption}</p>
                        </div>
                    ))}
                </div>
            )}

            {post.postType === 'gear-review' && post.gearReviewData && (
                <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black/20 relative">
                            <img
                                src={post.gearReviewData.imageUrl}
                                alt={post.gearReviewData.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1">
                                <Star size={16} fill="currentColor" className="text-yellow-400" />
                                <span className="text-sm font-bold text-white">{post.gearReviewData.rating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="mb-6">
                                <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                                    {post.gearReviewData.category}
                                </span>
                                <h2 className="text-3xl font-display font-bold mt-2">{post.gearReviewData.name}</h2>
                            </div>

                            <div className="bg-background/50 rounded-xl p-6 border border-border">
                                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Specs & Features</h3>
                                <p className="text-text-secondary whitespace-pre-wrap leading-relaxed font-mono text-sm">
                                    {post.gearReviewData.specs}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="prose-styles">
                        <h3>Review</h3>
                        <p className="whitespace-pre-wrap">{post.gearReviewData.review}</p>
                    </div>
                </div>
            )}

            {(post.attachedDocumentUrl || post.attachedAudioUrl) && (
                <div className="mt-12 pt-8 border-t border-border">
                    <h3 className="text-2xl font-display font-bold mb-4">Downloads & Resources</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                        {post.attachedDocumentUrl && (
                            <Button onClick={() => window.open(post.attachedDocumentUrl, '_blank')} variant="secondary" className="w-full">
                                <Download size={16} /> View/Download Document
                            </Button>
                        )}
                        {post.attachedAudioUrl && (
                            <div className="w-full">
                                <audio controls className="w-full rounded-lg" src={post.attachedAudioUrl}>
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};

const ImageWallView: React.FC<{
  posts: Post[],
  processingPosts: ProcessingPost[],
  onOpenLightbox: (items: { url: string; alt: string }[], startIndex: number) => void
}> = ({ posts, processingPosts, onOpenLightbox }) => {
  // Step 1: Memoize the collection of all images from props for performance.
  const allWallImages = React.useMemo(() => {
    const images: { id: string, url: string, alt: string }[] = [];

    posts.forEach(post => {
      if (post.showOnWall ?? true) {
        images.push({ id: post.id, url: post.imageUrl, alt: post.title });
      }
    });

    processingPosts.forEach(post => {
      switch (post.postType) {
        case 'before-after':
          if ((post.showBeforeOnWall ?? true) && post.beforeImageUrl) {
            images.push({ id: `${post.id}-before`, url: post.beforeImageUrl, alt: `${post.title} (Before)` });
          }
          if ((post.showAfterOnWall ?? true) && post.afterImageUrl) {
            images.push({ id: `${post.id}-after`, url: post.afterImageUrl, alt: `${post.title} (After)` });
          }
          break;
        case 'research':
          if ((post.showFeaturedOnWall ?? true) && post.featuredImageUrl) {
            images.push({ id: `${post.id}-featured`, url: post.featuredImageUrl, alt: post.title });
          }
          break;
        case 'gallery':
          post.galleryImages?.forEach(img => {
            if ((img.showOnWall ?? true) && img.imageUrl) {
              images.push({ id: img.id, url: img.imageUrl, alt: img.caption || post.title });
            }
          });
          break;
      }
    });

    return images;
  }, [posts, processingPosts]);

  // Step 2: Create state to hold the shuffled version of the images.
  const [shuffledImages, setShuffledImages] = React.useState<{ id: string, url: string, alt: string }[]>([]);

  // Step 3: Shuffle the images when the component loads or when the source images change.
  React.useEffect(() => {
    // Fisher-Yates (aka Knuth) shuffle algorithm
    const shuffled = [...allWallImages];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledImages(shuffled);
  }, [allWallImages]);


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <header className="py-8 text-center border-b border-border mb-8">
        <h1 className="text-4xl font-display font-bold">Image Wall</h1>
        <p className="mt-2 text-text-secondary max-w-2xl mx-auto">A curated collection of astrophotography from across the site.</p>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {shuffledImages.map((image, index) => (
          <div
            key={image.id}
            className="group aspect-square bg-surface border border-border rounded-lg overflow-hidden cursor-pointer relative"
            onClick={() => onOpenLightbox(shuffledImages.map(i => ({url: i.url, alt: i.alt})), index)}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading={index < 8 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
              <ZoomIn className="text-white h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AboutView: React.FC<{ config: AboutConfig }> = ({ config }) => (
  <section className="pb-12">
    <header className="py-8 text-center border-b border-border mb-8">
        <h1 className="text-4xl font-display font-bold">{config.title}</h1>
        <p className="mt-2 text-text-secondary max-w-2xl mx-auto">{config.subtitle}</p>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-1">
            <img
              src={config.imageUrl}
              alt={config.title || 'AstroCapture image'}
              className="rounded-lg shadow-2xl aspect-square object-cover"
              loading="lazy"
              decoding="async"
            />
        </div>
        <div className="md:col-span-2">
            <div className="prose-styles text-text-secondary leading-relaxed whitespace-pre-wrap mb-8" dangerouslySetInnerHTML={{ __html: config.bio.replace(/\n/g, '<br />') }}></div>
            <h3 className="text-2xl font-display font-bold mb-4 border-t border-border pt-8">Equipment</h3>
            <ul className="list-disc list-inside space-y-2 text-text-secondary font-mono">
                {config.gear.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </div>
    </div>
  </section>
);

const LicenseView: React.FC<{ config: LicenseConfig, onBack: () => void }> = ({ config, onBack }) => (
    <div className="pb-12">
        <Button onClick={onBack} variant="secondary" className="mb-8 !text-sm"><ChevronLeft size={16} /> Back</Button>
        <div className="bg-surface border border-border rounded-lg p-8">
            <h1 className="text-3xl font-display font-bold mb-4">{config.title}</h1>
            <p className="text-text-secondary whitespace-pre-wrap">{config.content}</p>
        </div>
    </div>
);

const LegalNoticeView: React.FC<{ config: LegalNoticeConfig, onBack: () => void }> = ({ config, onBack }) => (
    <div className="pb-12">
        <Button onClick={onBack} variant="secondary" className="mb-8 !text-sm"><ChevronLeft size={16} /> Back</Button>
        <div className="bg-surface border border-border rounded-lg p-8">
            <h1 className="text-3xl font-display font-bold mb-4">{config.title}</h1>
            <div className="prose-styles text-text-secondary leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: config.content }}></div>
        </div>
    </div>
);

const LoginView: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border p-8 rounded-lg">
      <h2 className="text-2xl font-display font-bold mb-6 text-center">Admin Login</h2>
      <form onSubmit={handleLogin} className="space-y-6">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit" className="w-full" isLoading={isLoading}>Login</Button>
      </form>
    </div>
  );
};

type AdminPanel = 'gallery' | 'articles' | 'global' | 'hero' | 'about' | 'articlesPage' | 'footer' | 'license' | 'imageWall' | 'cookieBanner' | 'legalNotice' | 'gear' | 'equipment';

const AdminDashboard: React.FC<{
  posts: Post[];
  processingPosts: ProcessingPost[];
  heroSlides: HeroSlide[];
  aboutConfig: AboutConfig;
  logoUrl: string;
  faviconUrl: string;
  footerConfig: FooterConfig;
  processingConfig: ProcessingConfig;
  licenseConfig: LicenseConfig;
  legalNoticeConfig: LegalNoticeConfig;
  cookieBannerConfig: CookieBannerConfig;
  gearItems: EquipmentItem[];
  equipment: AstroEquipment[];
  onLogout: () => void;
  onReset: () => void;
}> = (props) => {
  const [activePanel, setActivePanel] = React.useState<AdminPanel>('gallery');

const PanelButton: React.FC<{ panel: AdminPanel, icon: React.ReactNode, children: React.ReactNode }> = ({ panel, icon, children }) => (
  <button
    onClick={() => setActivePanel(panel)}
    className={`flex items-center gap-3 w-full p-3 rounded-md text-left transition-colors ${activePanel === panel ? 'bg-primary/20 text-text' : 'text-text-secondary hover:bg-surface'}`}
  >
    {icon}
    <span className="font-semibold">{children}</span>
  </button>
);

  const [isSavingGear, setIsSavingGear] = React.useState(false);
  const [isSavingEquipment, setIsSavingEquipment] = React.useState(false);

  const handleSaveGear = async (items: EquipmentItem[]) => {
      setIsSavingGear(true);
      try {
        const auth = getAuthInstance();
        if (!auth?.currentUser) {
            throw new Error("You must be logged in to save changes.");
        }

        const currentItems = props.gearItems || [];
        const newItemsList = items || [];

        // 1. Get current IDs from props to know what to delete
        const currentIds = new Set(currentItems.map(i => i.id));
        const newIds = new Set(newItemsList.map(i => i.id));

        // Delete removed items
        for (const item of currentItems) {
            if (!newIds.has(item.id)) {
                await deleteCollectionItem('gear', item.id);
            }
        }

        // Save/Update items
        for (const item of newItemsList) {
            await saveCollectionItem('gear', item.id, item);
        }

        alert('Gear settings saved successfully!');
      } catch (error: any) {
        console.error("Error saving gear:", error);
        alert(`Failed to save gear: ${error.message}`);
      } finally {
        setIsSavingGear(false);
      }
  };

  const handleSaveEquipment = async (items: AstroEquipment[]) => {
      setIsSavingEquipment(true);
      try {
        const auth = getAuthInstance();
        if (!auth?.currentUser) {
            throw new Error("You must be logged in to save changes.");
        }

        const currentIds = new Set(props.equipment.map(i => i.id));
        const newIds = new Set(items.map(i => i.id));

        for (const item of props.equipment) {
            if (!newIds.has(item.id)) {
                await deleteCollectionItem('my_equipment', item.id);
            }
        }

        for (const item of items) {
            await saveCollectionItem('my_equipment', item.id, item);
        }

        alert('Equipment saved successfully!');
      } catch (error: any) {
        console.error("Error saving equipment:", error);
        alert(`Failed to save equipment: ${error.message}`);
      } finally {
        setIsSavingEquipment(false);
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1 bg-surface border border-border rounded-lg p-4 self-start">
        <h2 className="text-xl font-display font-bold mb-4 p-2">CMS Dashboard</h2>
        <div className="space-y-2">
          <PanelButton panel="gallery" icon={<LayoutDashboard size={18} />}>Gallery</PanelButton>
          <PanelButton panel="articles" icon={<Newspaper size={18} />}>Articles & Tutorials</PanelButton>
          <PanelButton panel="gear" icon={<Wrench size={18} />}>Gear Reviews</PanelButton>
          <PanelButton panel="equipment" icon={<Radio size={18} />}>My Equipment</PanelButton>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Site Settings</h3>
          <div className="space-y-2">
            <PanelButton panel="global" icon={<Globe size={18} />}>Global Settings</PanelButton>
            <PanelButton panel="hero" icon={<LayoutTemplate size={18} />}>Hero Slider</PanelButton>
            <PanelButton panel="imageWall" icon={<ImageIcon size={18} />}>Image Wall</PanelButton>
            <PanelButton panel="about" icon={<User size={18} />}>About Page</PanelButton>
            <PanelButton panel="articlesPage" icon={<Newspaper size={18} />}>Articles Page</PanelButton>
            <PanelButton panel="footer" icon={<Milestone size={18} />}>Footer</PanelButton>
            <PanelButton panel="license" icon={<ShieldCheck size={18} />}>License Page</PanelButton>
            <PanelButton panel="legalNotice" icon={<FileText size={18} />}>Legal Notice</PanelButton>
            <PanelButton panel="cookieBanner" icon={<Cookie size={18} />}>Cookie Banner</PanelButton>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border space-y-2">
            <Button variant="secondary" onClick={props.onReset} className="w-full"><RotateCw size={14}/> Factory Reset</Button>
            <Button variant="danger" onClick={props.onLogout} className="w-full"><LogOut size={14}/> Logout</Button>
        </div>
      </aside>
      <main className="lg:col-span-3">
        {activePanel === 'gallery' && <AdminGalleryPanel posts={props.posts} />}
        {activePanel === 'articles' && <AdminProcessingPanel posts={props.processingPosts} />}
        {activePanel === 'imageWall' && <AdminImageWallPanel posts={props.posts} processingPosts={props.processingPosts} />}
        {activePanel === 'gear' && (
            <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading...</div>}>
            <GearSettingsForm
                initialData={props.gearItems}
                onSave={handleSaveGear}
                isSaving={isSavingGear}
            />
            </React.Suspense>
        )}
        {activePanel === 'equipment' && (
            <React.Suspense fallback={<div className="text-center py-20 text-text-secondary">Loading...</div>}>
            <EquipmentTrackerForm
                initialData={props.equipment}
                onSave={handleSaveEquipment}
                isSaving={isSavingEquipment}
            />
            </React.Suspense>
        )}
        {activePanel !== 'gallery' && activePanel !== 'articles' && activePanel !== 'imageWall' && activePanel !== 'gear' && activePanel !== 'equipment' && (
          <AdminSettingsPanel
            key={activePanel}
            activeSection={activePanel}
            {...props}
            legalNoticeConfig={props.legalNoticeConfig}
            cookieBannerConfig={props.cookieBannerConfig}
          />
        )}
      </main>
    </div>
  );
};

const AdminImageWallPanel: React.FC<{ posts: Post[], processingPosts: ProcessingPost[] }> = ({ posts, processingPosts }) => {
  type WallImageItem = {
    id: string;
    url: string;
    label: string;
    isChecked: boolean;
    collection: 'posts' | 'processingPosts';
    docId: string;
    imageType?: 'main' | 'before' | 'after' | 'featured' | 'gallery';
    galleryImageId?: string;
  };

  const wallImages = React.useMemo<WallImageItem[]>(() => {
    const allImages: WallImageItem[] = [];

    posts.forEach(p => {
      if (p.imageUrl) {
        allImages.push({
          id: `post-${p.id}`, url: p.imageUrl, label: `${p.title} (Gallery Post)`,
          isChecked: p.showOnWall ?? true, collection: 'posts', docId: p.id, imageType: 'main'
        });
      }
    });

    processingPosts.forEach(p => {
      if (p.postType === 'before-after') {
        if (p.beforeImageUrl) allImages.push({
          id: `proc-before-${p.id}`, url: p.beforeImageUrl, label: `${p.title} (Before)`,
          isChecked: p.showBeforeOnWall ?? true, collection: 'processingPosts', docId: p.id, imageType: 'before'
        });
        if (p.afterImageUrl) allImages.push({
          id: `proc-after-${p.id}`, url: p.afterImageUrl, label: `${p.title} (After)`,
          isChecked: p.showAfterOnWall ?? true, collection: 'processingPosts', docId: p.id, imageType: 'after'
        });
      } else if (p.postType === 'research') {
        if (p.featuredImageUrl) allImages.push({
          id: `proc-featured-${p.id}`, url: p.featuredImageUrl, label: `${p.title} (Featured)`,
          isChecked: p.showFeaturedOnWall ?? true, collection: 'processingPosts', docId: p.id, imageType: 'featured'
        });
      } else if (p.postType === 'gallery') {
        p.galleryImages?.forEach((img, index) => {
          if (img.imageUrl) allImages.push({
            id: `proc-gallery-${p.id}-${img.id}`, url: img.imageUrl, label: `${p.title} (Gallery #${index + 1})`,
            isChecked: img.showOnWall ?? true, collection: 'processingPosts', docId: p.id, imageType: 'gallery', galleryImageId: img.id
          });
        });
      }
    });
    return allImages;
  }, [posts, processingPosts]);

  const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});

  const handleToggle = async (item: WallImageItem, isChecked: boolean) => {
    setIsSaving(prev => ({ ...prev, [item.id]: true }));
    try {
      if (item.collection === 'posts') {
        await saveCollectionItem('posts', item.docId, { showOnWall: isChecked });
      } else if (item.collection === 'processingPosts') {
        if (item.imageType === 'gallery') {
          const postToUpdate = processingPosts.find(p => p.id === item.docId);
          if (!postToUpdate || !postToUpdate.galleryImages) throw new Error("Post not found");
          const updatedGalleryImages = postToUpdate.galleryImages.map(img =>
            img.id === item.galleryImageId ? { ...img, showOnWall: isChecked } : img
          );
          await saveCollectionItem('processingPosts', item.docId, { galleryImages: updatedGalleryImages });
        } else {
          const fieldMap = {
            'before': 'showBeforeOnWall', 'after': 'showAfterOnWall', 'featured': 'showFeaturedOnWall'
          };
          const field = fieldMap[item.imageType as keyof typeof fieldMap];
          if (field) {
            await saveCollectionItem('processingPosts', item.docId, { [field]: isChecked });
          }
        }
      }
    } catch (e) {
      console.error("Failed to update image visibility:", e);
      alert("Update failed. Please check the console for details.");
    } finally {
      setIsSaving(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <div className="bg-surface border border-border p-6 rounded-lg">
      <h3 className="text-xl font-display font-bold mb-4">Image Wall Management</h3>
      <p className="text-sm text-text-secondary mb-6">Use the toggles below to control which images appear on the public "Image Wall" page. Changes are saved automatically.</p>
      <div className="space-y-2">
        {wallImages.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-md border border-border">
            <div className="flex items-center gap-4 overflow-hidden">
              <img src={item.url} alt={item.label} className="w-12 h-12 object-cover rounded flex-shrink-0" loading="lazy" decoding="async" />
              <p className="font-semibold truncate" title={item.label}>{item.label}</p>
            </div>
            <ToggleSwitch
              label=""
              checked={item.isChecked}
              onChange={(checked) => handleToggle(item, checked)}
              className="flex-shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
};


const AdminGalleryPanel: React.FC<{ posts: Post[] }> = ({ posts }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<Post | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [rawDataFile, setRawDataFile] = React.useState<File | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [acquisitionLogs, setAcquisitionLogs] = React.useState<AcquisitionLogEntry[]>([]);

  const openModal = (post: Post | null) => {
    if (post) {
      setEditingPost(post);
      setAcquisitionLogs(post.acquisitionLogs || []);
    } else {
      setEditingPost({
        id: `post_${Date.now()}`,
        title: '',
        imageUrl: '',
        objectName: '',
        captureDate: new Date().toISOString().split('T')[0],
        equipment: '',
        description: '',
        tags: [],
        totalIntegrationTime: 0,
        acquisitionLogs: [],
        showOnWall: true,
      });
      setAcquisitionLogs([]);
    }
    setImageFile(null);
    setRawDataFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleFieldChange = (field: keyof Post, value: any) => {
    if (!editingPost) return;
    setEditingPost(prev => ({ ...prev!, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingPost) return;
    setIsSaving(true);
    let finalPost = { ...editingPost };
    finalPost.showOnWall = finalPost.showOnWall ?? true;

    if (imageFile) {
      try {
        const uploaded = await uploadFile(imageFile, 'gallery-images');
        finalPost.imageUrl = uploaded.url;
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Image upload failed. Please try again.");
        setIsSaving(false);
        return;
      }
    }

    if (rawDataFile) {
      try {
        const uploadedRaw = await uploadFile(rawDataFile, 'raw-data');
        finalPost.rawDataUrl = uploadedRaw.url;
      } catch (error) {
        console.error("Raw data upload failed:", error);
        alert("Raw data upload failed. Please try again.");
        setIsSaving(false);
        return;
      }
    }

    const tags = Array.isArray(finalPost.tags) ? finalPost.tags : (finalPost.tags as unknown as string).split(',').map(t => t.trim()).filter(Boolean);

    const totalMinutes = acquisitionLogs.reduce((total, log) => total + (log.exposureCount * log.exposureLength) / 60, 0);

    try {
      await saveCollectionItem('posts', finalPost.id, { ...finalPost, tags, acquisitionLogs, totalIntegrationTime: totalMinutes });
      closeModal();
      window.dispatchEvent(new Event('astrocapture-refresh'));
    } catch (error) {
      console.error("Failed to save post:", error);
      alert("Failed to save post. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deleteCollectionItem('posts', postId);
    }
  };

  const handleLogChange = (index: number, field: keyof AcquisitionLogEntry, value: any) => {
    const newLogs = [...acquisitionLogs];
    newLogs[index] = { ...newLogs[index], [field]: value };
    setAcquisitionLogs(newLogs);
  };

  const addLogEntry = () => {
    const newLog: AcquisitionLogEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      filter: 'L-Pro',
      exposureCount: 1,
      exposureLength: 300,
    };
    setAcquisitionLogs([...acquisitionLogs, newLog]);
  };

  const removeLogEntry = (index: number) => {
    setAcquisitionLogs(acquisitionLogs.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-surface border border-border p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-display font-bold">Gallery Manager</h3>
        <Button onClick={() => openModal(null)}><Plus size={16} /> Add New Post</Button>
      </div>
      <div className="space-y-2">
        {posts.map(post => (
          <div key={post.id} className="flex items-center justify-between p-3 bg-background rounded-md border border-border">
            <div className="flex items-center gap-4">
              <img src={post.imageUrl} alt={post.title} className="w-12 h-12 object-cover rounded" loading="lazy" decoding="async" />
              <div>
                <p className="font-semibold">{post.title}</p>
                <p className="text-sm text-text-secondary">{post.objectName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openModal(post)}><Edit2 size={14} /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} className="text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingPost && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPost.id.startsWith('post_') ? 'Add New Post' : 'Edit Post'}>
          <div className="space-y-4">
            <Input label="Title" value={editingPost.title} onChange={e => handleFieldChange('title', e.target.value)} />
            <Input label="Object Name (e.g., M42)" value={editingPost.objectName} onChange={e => handleFieldChange('objectName', e.target.value)} />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description (HTML supported)</label>
              <TextArea value={editingPost.description} onChange={e => handleFieldChange('description', e.target.value)} rows={5} />
            </div>

            <ImageUploader
              label="Featured Image"
              currentImageUrl={editingPost.imageUrl}
              imageFile={imageFile}
              onUrlChange={url => handleFieldChange('imageUrl', url)}
              onFileChange={setImageFile}
              id="gallery-image-upload"
            />
            <Input label="Equipment" value={editingPost.equipment} onChange={e => handleFieldChange('equipment', e.target.value)} />
            <div className="flex gap-4">
                <Input label="Capture Date" type="date" value={editingPost.captureDate} onChange={e => handleFieldChange('captureDate', e.target.value)} />
                <Input label="Tags (comma-separated)" value={Array.isArray(editingPost.tags) ? editingPost.tags.join(', ') : editingPost.tags} onChange={e => handleFieldChange('tags', e.target.value)} />
            </div>

            <div className="pt-4 border-t border-border">
              <ToggleSwitch
                label="Show on Image Wall"
                checked={editingPost.showOnWall ?? true}
                onChange={checked => handleFieldChange('showOnWall', checked)}
              />
            </div>

            <div className="flex gap-4">
                <Input label="Astrobin URL (optional)" value={editingPost.astrobinUrl} onChange={e => handleFieldChange('astrobinUrl', e.target.value)} />
                <div className="flex-1">
                  <FileUploader
                    label="Raw Data (optional)"
                    currentFileUrl={editingPost.rawDataUrl || ''}
                    file={rawDataFile}
                    onUrlChange={url => handleFieldChange('rawDataUrl', url)}
                    onFileChange={setRawDataFile}
                    id="gallery-raw-data-upload"
                    icon={<Database size={16} />}
                  />
                </div>
            </div>

            <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Acquisition Log</h4>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {acquisitionLogs.map((log, index) => (
                        <div key={log.id} className="bg-background p-3 rounded-lg border border-border/50 space-y-2">
                           <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-text-secondary">Entry #{index + 1}</span>
                                <Button variant="ghost" size="sm" onClick={() => removeLogEntry(index)} className="text-red-500 hover:bg-red-500/10"><Trash2 size={14}/></Button>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                                <Input label="Date" type="date" value={log.date} onChange={e => handleLogChange(index, 'date', e.target.value)} />
                                <Input label="Filter" placeholder="e.g., L-Pro" value={log.filter} onChange={e => handleLogChange(index, 'filter', e.target.value)} />
                                <Input label="Frames" type="number" value={log.exposureCount} onChange={e => handleLogChange(index, 'exposureCount', parseInt(e.target.value))} />
                                <Input label="Exposure (s)" type="number" value={log.exposureLength} onChange={e => handleLogChange(index, 'exposureLength', parseInt(e.target.value))} />
                           </div>
                        </div>
                    ))}
                </div>
                 <Button onClick={addLogEntry} variant="secondary" size="sm" className="mt-2"><Plus size={14}/> Add New Entry</Button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSave} isLoading={isSaving}>Save Post</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

const AdminProcessingPanel: React.FC<{ posts: ProcessingPost[] }> = ({ posts }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingPost, setEditingPost] = React.useState<ProcessingPost | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);

    const [beforeImageFile, setBeforeImageFile] = React.useState<File | null>(null);
    const [afterImageFile, setAfterImageFile] = React.useState<File | null>(null);
    const [featuredImageFile, setFeaturedImageFile] = React.useState<File | null>(null);
    const [documentFile, setDocumentFile] = React.useState<File | null>(null);
    const [audioFile, setAudioFile] = React.useState<File | null>(null);

    const [galleryImages, setGalleryImages] = React.useState<ImageEntry[]>([]);
    const [galleryImageFiles, setGalleryImageFiles] = React.useState<Record<string, File | null>>({});
    const dragItem = React.useRef<number | null>(null);
    const dragOverItem = React.useRef<number | null>(null);

    const openModal = (post: ProcessingPost | null) => {
        if (post) {
            setEditingPost(post);
            setGalleryImages(post.galleryImages || []);
        } else {
            setEditingPost({
                id: `proc_${Date.now()}`,
                title: '',
                description: '',
                tags: [],
                captureDate: new Date().toISOString().split('T')[0],
                postType: 'before-after',
                galleryImages: [],
                showBeforeOnWall: true,
                showAfterOnWall: true,
                showFeaturedOnWall: true,
            });
            setGalleryImages([]);
        }
        setBeforeImageFile(null);
        setAfterImageFile(null);
        setFeaturedImageFile(null);
        setDocumentFile(null);
        setAudioFile(null);
        setGalleryImageFiles({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPost(null);
    };

    const handleFieldChange = (field: keyof ProcessingPost, value: any) => {
        if (!editingPost) return;
        setEditingPost(prev => ({ ...prev!, [field]: value }));
    };

    const addGalleryImage = () => setGalleryImages([...galleryImages, { id: `img_${Date.now()}`, imageUrl: '', caption: '', showOnWall: true }]);
    const removeGalleryImage = (id: string) => setGalleryImages(galleryImages.filter(img => img.id !== id));
    const handleGalleryImageChange = (id: string, field: 'imageUrl' | 'caption' | 'showOnWall', value: string | boolean) => {
        setGalleryImages(galleryImages.map(img => img.id === id ? { ...img, [field]: value } : img));
    };
    const handleGalleryFileChange = (id: string, file: File | null) => {
        setGalleryImageFiles(prev => ({ ...prev, [id]: file }));
        if (file) handleGalleryImageChange(id, 'imageUrl', '');
    };
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => { dragItem.current = index; };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => { dragOverItem.current = index; };
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newImages = [...galleryImages];
            const draggedItemContent = newImages.splice(dragItem.current, 1)[0];
            newImages.splice(dragOverItem.current, 0, draggedItemContent);
            dragItem.current = null;
            dragOverItem.current = null;
            setGalleryImages(newImages);
        }
    };


    const handleSave = async () => {
        if (!editingPost) return;
        setIsSaving(true);

        let finalData: any = { ...editingPost };
        console.log('=== handleSave START ===');
        console.log('postType:', editingPost.postType);
        console.log('galleryImages state:', galleryImages);
        console.log('galleryImageFiles keys:', Object.keys(galleryImageFiles));

        try {
            if (editingPost.postType !== 'gallery') {
              if (beforeImageFile) { const u = await uploadFile(beforeImageFile, 'processing-images'); finalData.beforeImageUrl = u.url; }
              if (afterImageFile) { const u = await uploadFile(afterImageFile, 'processing-images'); finalData.afterImageUrl = u.url; }
              if (featuredImageFile) { const u = await uploadFile(featuredImageFile, 'processing-images'); finalData.featuredImageUrl = u.url; }
            }
            if (documentFile) { const u = await uploadFile(documentFile, 'documents'); finalData.attachedDocumentUrl = u.url; }
            if (audioFile) { const u = await uploadFile(audioFile, 'audio'); finalData.attachedAudioUrl = u.url; }

            if (editingPost.postType === 'gallery') {
              console.log('Gallery save — uploading', galleryImages.length, 'images');
              const uploadedImages = await Promise.all(galleryImages.map(async (img) => {
                  const file = galleryImageFiles[img.id];
                  console.log('Processing image', img.id, 'file exists:', !!file);
                  if (file) {
                      const uploaded = await uploadFile(file, 'gallery-posts');
                      console.log('Uploaded URL:', uploaded.url);
                      return { ...img, imageUrl: uploaded.url };
                  }
                  return img;
              }));
              finalData.galleryImages = uploadedImages;
              finalData.beforeImageUrl = null;
              finalData.afterImageUrl = null;
              finalData.featuredImageUrl = null;
              console.log('Final galleryImages:', JSON.stringify(finalData.galleryImages));
            }

            const tags = Array.isArray(finalData.tags) ? finalData.tags : (finalData.tags as unknown as string).split(',').map(t => t.trim()).filter(Boolean);

            console.log('Saving with finalData keys:', Object.keys(finalData));
            console.log('Saving galleryImages:', JSON.stringify(finalData.galleryImages));
            await saveCollectionItem('processingPosts', finalData.id, { ...finalData, tags });
            console.log('=== Save SUCCESS ===');
            closeModal();
            window.dispatchEvent(new Event('astrocapture-refresh'));
        } catch (error) {
            console.error("Failed to save processing post:", error);
            alert("Save failed. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (postId: string) => {
        if (confirm('Are you sure you want to delete this article?')) {
            await deleteCollectionItem('processingPosts', postId);
        }
    };

    const getPostThumbnail = (post: ProcessingPost) => {
        switch (post.postType) {
            case 'before-after': return post.afterImageUrl;
            case 'research': return post.featuredImageUrl;
            case 'gallery': return post.galleryImages?.[0]?.imageUrl;
            default: return '';
        }
    };

    return (
        <div className="bg-surface border border-border p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-display font-bold">Articles & Tutorials</h3>
                <Button onClick={() => openModal(null)}><Plus size={16} /> New Article</Button>
            </div>
            <div className="space-y-2">
                {posts.map(post => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-background rounded-md border border-border">
                        <div className="flex items-center gap-4">
                            <img src={getPostThumbnail(post)} alt={post.title} className="w-16 h-10 object-cover rounded" loading="lazy" decoding="async" />
                            <div>
                                <p className="font-semibold">{post.title}</p>
                                <p className="text-xs text-text-secondary uppercase">{post.postType}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openModal(post)}><Edit2 size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} className="text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></Button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && editingPost && (
                <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPost.id.startsWith('proc_') ? 'New Article' : 'Edit Article'}>
                    <div className="space-y-6">
                        <Input label="Title" value={editingPost.title} onChange={e => handleFieldChange('title', e.target.value)} />

                        <Select
                            label="Post Type"
                            value={editingPost.postType}
                            onChange={e => handleFieldChange('postType', e.target.value as 'before-after' | 'research' | 'gallery')}
                        >
                            <option value="before-after">Before & After</option>
                            <option value="research">Research</option>
                            <option value="gallery">Gallery</option>
                        </Select>

                        {editingPost.postType === 'before-after' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ImageUploader label="Before Image" currentImageUrl={editingPost.beforeImageUrl || ''} imageFile={beforeImageFile} onUrlChange={url => handleFieldChange('beforeImageUrl', url)} onFileChange={setBeforeImageFile} id="before-img-upload" />
                                <ImageUploader label="After Image" currentImageUrl={editingPost.afterImageUrl || ''} imageFile={afterImageFile} onUrlChange={url => handleFieldChange('afterImageUrl', url)} onFileChange={setAfterImageFile} id="after-img-upload" />
                                <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
                                  <ToggleSwitch label="Show 'Before' on Image Wall" checked={editingPost.showBeforeOnWall ?? true} onChange={c => handleFieldChange('showBeforeOnWall', c)} />
                                  <ToggleSwitch label="Show 'After' on Image Wall" checked={editingPost.showAfterOnWall ?? true} onChange={c => handleFieldChange('showAfterOnWall', c)} />
                                </div>
                            </div>
                        )}

                        {editingPost.postType === 'research' && (
                            <div className="space-y-4">
                                <ImageUploader label="Featured Image" currentImageUrl={editingPost.featuredImageUrl || ''} imageFile={featuredImageFile} onUrlChange={url => handleFieldChange('featuredImageUrl', url)} onFileChange={setFeaturedImageFile} id="featured-img-upload" />
                                <FileUploader label="Attached Document" currentFileUrl={editingPost.attachedDocumentUrl || ''} file={documentFile} onUrlChange={url => handleFieldChange('attachedDocumentUrl', url)} onFileChange={setDocumentFile} id="doc-upload" icon={<FileIcon size={24} className="text-text-secondary" />} accept=".pdf,.doc,.docx,.txt" />
                                <FileUploader label="Attached Audio" currentFileUrl={editingPost.attachedAudioUrl || ''} file={audioFile} onUrlChange={url => handleFieldChange('attachedAudioUrl', url)} onFileChange={setAudioFile} id="audio-upload" icon={<AudioWaveform size={24} className="text-text-secondary" />} accept="audio/*" />
                                <div className="border-t border-border pt-4">
                                   <ToggleSwitch label="Show Featured Image on Wall" checked={editingPost.showFeaturedOnWall ?? true} onChange={c => handleFieldChange('showFeaturedOnWall', c)} />
                                </div>
                            </div>
                        )}

                        {editingPost.postType === 'gallery' && (
                          <div className="space-y-4 pt-4 border-t border-border">
                              <h4 className="font-semibold text-text">Gallery Images</h4>
                              <div className="space-y-3">
                                  {galleryImages.map((image, index) => (
                                      <DraggableListItem
                                          key={image.id}
                                          index={index}
                                          onDragStart={(e) => handleDragStart(e, index)}
                                          onDragEnter={(e) => handleDragEnter(e, index)}
                                          onDragEnd={handleDragEnd}
                                      >
                                          <div className="w-full space-y-3">
                                              <ImageUploader
                                                  label={`Image ${index + 1}`}
                                                  currentImageUrl={image.imageUrl}
                                                  imageFile={galleryImageFiles[image.id] || null}
                                                  onUrlChange={url => handleGalleryImageChange(image.id, 'imageUrl', url)}
                                                  onFileChange={file => handleGalleryFileChange(image.id, file)}
                                                  id={`gallery-upload-${image.id}`}
                                              />
                                              <Input
                                                  label="Caption"
                                                  value={image.caption}
                                                  onChange={e => handleGalleryImageChange(image.id, 'caption', e.target.value)}
                                              />
                                              <ToggleSwitch
                                                  label="Show on Image Wall"
                                                  checked={image.showOnWall ?? true}
                                                  onChange={c => handleGalleryImageChange(image.id, 'showOnWall', c)}
                                              />
                                          </div>
                                          <Button variant="ghost" size="sm" onClick={() => removeGalleryImage(image.id)} className="text-red-500 hover:bg-red-500/10 ml-2 mt-6"><Trash2 size={14} /></Button>
                                      </DraggableListItem>
                                  ))}
                              </div>
                              <Button onClick={addGalleryImage} variant="secondary" size="sm"><Plus size={14}/> Add Image</Button>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1">Content / Description</label>
                          <RichTextEditor value={editingPost.description} onChange={html => handleFieldChange('description', html)} />
                        </div>

                        <div className="flex gap-4">
                            <Input label="Publish Date" type="date" value={editingPost.captureDate} onChange={e => handleFieldChange('captureDate', e.target.value)} />
                            <Input label="Tags (comma-separated)" value={Array.isArray(editingPost.tags) ? editingPost.tags.join(', ') : editingPost.tags} onChange={e => handleFieldChange('tags', e.target.value)} />
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-border">
                            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                            <Button onClick={handleSave} isLoading={isSaving}>Save Article</Button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
};

// --- START: Admin Settings Forms Refactor ---

const SectionContainer: React.FC<{ title: string; children: React.ReactNode, onSave: () => void, isLoading: boolean }> = ({ title, children, onSave, isLoading }) => (
    <div className="bg-surface border border-border rounded-lg">
        <div className="p-4 border-b border-border">
            <h3 className="text-lg font-display font-bold">{title}</h3>
        </div>
        <div className="p-4 space-y-4">
            {children}
            <div className="flex justify-end pt-2">
                <Button onClick={onSave} isLoading={isLoading}>Save Changes</Button>
            </div>
        </div>
    </div>
);

const GlobalSettingsForm = React.memo((props: { initialData: { logoUrl: string, faviconUrl: string }, onSave: (data: any) => void, isSaving: boolean }) => {
    const [logoUrl, setLogoUrl] = React.useState(props.initialData.logoUrl);
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [faviconUrl, setFaviconUrl] = React.useState(props.initialData.faviconUrl);
    const [faviconFile, setFaviconFile] = React.useState<File | null>(null);

    return (
      <SectionContainer title="Global Settings" onSave={() => props.onSave({ logoUrl, logoFile, faviconUrl, faviconFile })} isLoading={props.isSaving}>
        <ImageUploader label="Logo URL" currentImageUrl={logoUrl} imageFile={logoFile} onUrlChange={setLogoUrl} onFileChange={setLogoFile} id="logo-upload" />
        <ImageUploader label="Favicon URL" currentImageUrl={faviconUrl} imageFile={faviconFile} onUrlChange={setFaviconUrl} onFileChange={setFaviconFile} id="favicon-upload" />
      </SectionContainer>
    );
});

const HeroSettingsForm = React.memo((props: { initialData: HeroSlide[], allPosts: { posts: Post[], processingPosts: ProcessingPost[]}, onSave: (data: any) => void, isSaving: boolean }) => {
    const [slides, setSlides] = React.useState<HeroSlide[]>(props.initialData);
    const dragItem = React.useRef<number | null>(null);
    const dragOverItem = React.useRef<number | null>(null);

    const handleSlideChange = (index: number, field: keyof HeroSlide, value: any) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        setSlides(newSlides);
    };

    const handleSlideImageFileChange = (index: number, file: File | null) => {
        const newSlides: any[] = [...slides];
        newSlides[index].tempFile = file;
        setSlides(newSlides);
    };

    const addSlide = () => setSlides([...slides, { id: `slide_${Date.now()}`, title: 'New Slide', subtitle: '', description: '', imageUrl: '', linkText: '', linkUrl: '' }]);
    const removeSlide = (index: number) => setSlides(slides.filter((_, i) => i !== index));

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => { dragItem.current = index; };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => { dragOverItem.current = index; };
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newSlides = [...slides];
            const draggedItemContent = newSlides.splice(dragItem.current, 1)[0];
            newSlides.splice(dragOverItem.current, 0, draggedItemContent);
            dragItem.current = null;
            dragOverItem.current = null;
            setSlides(newSlides);
        }
    };

    return (
      <SectionContainer title="Hero Slider Manager" onSave={() => props.onSave(slides)} isLoading={props.isSaving}>
        <div className="space-y-4">
          {slides.map((slide, index) => (
              <DraggableListItem key={slide.id} index={index} onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd}>
                  <div className="space-y-3 w-full">
                      <Input label="Title" value={slide.title} onChange={e => handleSlideChange(index, 'title', e.target.value)} />
                      <Input label="Subtitle" value={slide.subtitle} onChange={e => handleSlideChange(index, 'subtitle', e.target.value)} />
                      <TextArea label="Description" value={slide.description} onChange={e => handleSlideChange(index, 'description', e.target.value)} rows={3} />
                      <ImageUploader label="Image" currentImageUrl={slide.imageUrl} imageFile={(slide as any).tempFile} onUrlChange={url => handleSlideChange(index, 'imageUrl', url)} onFileChange={file => handleSlideImageFileChange(index, file)} id={`slide-img-${index}`} />
                      <div className="flex flex-col md:flex-row gap-4">
                          <Input label="Link Text" value={slide.linkText} onChange={e => handleSlideChange(index, 'linkText', e.target.value)} />
                          <div className="w-full space-y-2">
                              <Select label="Quick Link (optional)" onChange={e => handleSlideChange(index, 'linkUrl', e.target.value)} value="">
                                  <option value="">-- Select an internal link --</option>
                                  <optgroup label="Pages">
                                    <option value="gallery">Home / Gallery</option>
                                    <option value="image-of-the-day">Image Of The Day</option>
                                    <option value="image-wall">Image Wall</option>
                                    <option value="articles">Articles</option>
                                    <option value="astro-index">Astro Index</option>
                                    <option value="about">About</option>
                                  </optgroup>
                                  {props.allPosts.posts.length > 0 && (<optgroup label="Gallery Posts">{props.allPosts.posts.map(p => (<option key={p.id} value={`post:${p.id}`}>{p.title}</option>))}</optgroup>)}
                                  {props.allPosts.processingPosts.length > 0 && (<optgroup label="Articles">{props.allPosts.processingPosts.map(p => (<option key={p.id} value={`processingPost:${p.id}`}>{p.title}</option>))}</optgroup>)}
                              </Select>
                              <Input label="Link URL" placeholder="Select a quick link or paste a URL" value={slide.linkUrl} onChange={e => handleSlideChange(index, 'linkUrl', e.target.value)} />
                          </div>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => removeSlide(index)} className="self-start"><Trash2 size={14} /> Remove Slide</Button>
                  </div>
              </DraggableListItem>
          ))}
          <Button variant="secondary" onClick={addSlide}><Plus size={16} /> Add Slide</Button>
        </div>
      </SectionContainer>
    );
});

const AboutSettingsForm = React.memo((props: { initialData: AboutConfig, onSave: (data: any) => void, isSaving: boolean }) => {
    const [about, setAbout] = React.useState(props.initialData);
    const [aboutImageFile, setAboutImageFile] = React.useState<File | null>(null);

    return (
      <SectionContainer title="About Page Manager" onSave={() => props.onSave({ about, aboutImageFile })} isLoading={props.isSaving}>
          <Input label="Title" value={about.title} onChange={e => setAbout({...about, title: e.target.value})} />
          <Input label="Subtitle" value={about.subtitle} onChange={e => setAbout({...about, subtitle: e.target.value})} />
          <ImageUploader label="Profile Image" currentImageUrl={about.imageUrl} imageFile={aboutImageFile} onUrlChange={url => setAbout({...about, imageUrl: url})} onFileChange={setAboutImageFile} id="about-img-upload" />
          <TextArea label="Bio" value={about.bio} onChange={e => setAbout({...about, bio: e.target.value})} rows={6} />
          <TextArea label="Equipment (one item per line)" value={Array.isArray(about.gear) ? about.gear.join('\n') : about.gear} onChange={e => setAbout({...about, gear: e.target.value.split('\n')})} rows={5} />
      </SectionContainer>
    );
});

const ArticlesPageSettingsForm = React.memo((props: { initialData: ProcessingConfig, onSave: (data: any) => void, isSaving: boolean }) => {
    const [processing, setProcessing] = React.useState(props.initialData);

    return (
      <SectionContainer title="Articles Page Manager" onSave={() => props.onSave(processing)} isLoading={props.isSaving}>
          <Input label="Title" value={processing.title} onChange={e => setProcessing({...processing, title: e.target.value})} />
          <Input label="Subtitle" value={processing.subtitle} onChange={e => setProcessing({...processing, subtitle: e.target.value})} />
          <TextArea label="Intro Paragraph" value={processing.introParagraph} onChange={e => setProcessing({...processing, introParagraph: e.target.value})} rows={4} />
      </SectionContainer>
    );
});

const FooterSettingsForm = React.memo((props: { initialData: FooterConfig, onSave: (data: any) => void, isSaving: boolean }) => {
    const [footer, setFooter] = React.useState(props.initialData);

    return (
      <SectionContainer title="Footer Manager" onSave={() => props.onSave(footer)} isLoading={props.isSaving}>
          <TextArea label="Footer Text" value={footer.text} onChange={e => setFooter({...footer, text: e.target.value})} rows={3} />
          <Input label="Instagram URL" value={footer.socialLinks.instagram} onChange={e => setFooter({...footer, socialLinks: {...footer.socialLinks, instagram: e.target.value}})} />
          <Input label="Twitter URL" value={footer.socialLinks.twitter} onChange={e => setFooter({...footer, socialLinks: {...footer.socialLinks, twitter: e.target.value}})} />
      </SectionContainer>
    );
});

const LicenseSettingsForm = React.memo((props: { initialData: LicenseConfig, onSave: (data: any) => void, isSaving: boolean }) => {
    const [license, setLicense] = React.useState(props.initialData);

    return (
      <SectionContainer title="License Page Manager" onSave={() => props.onSave(license)} isLoading={props.isSaving}>
          <Input label="Title" value={license.title} onChange={e => setLicense({...license, title: e.target.value})} />
          <TextArea label="Content" value={license.content} onChange={e => setLicense({...license, content: e.target.value})} rows={8} />
      </SectionContainer>
    );
});


const LegalNoticeSettingsForm = React.memo((props: { initialData: LegalNoticeConfig, onSave: (data: any) => void, isSaving: boolean }) => {
    const [legalNotice, setLegalNotice] = React.useState(props.initialData);

    return (
      <SectionContainer title="Legal Notice Manager" onSave={() => props.onSave(legalNotice)} isLoading={props.isSaving}>
          <Input label="Title" value={legalNotice.title} onChange={e => setLegalNotice({...legalNotice, title: e.target.value})} />
          <RichTextEditor value={legalNotice.content} onChange={html => setLegalNotice({...legalNotice, content: html})} />
      </SectionContainer>
    );
});

const CookieBannerSettingsForm = React.memo((props: { initialData: CookieBannerConfig, onSave: (data: any) => void, isSaving: boolean }) => {
    const [cookieBanner, setCookieBanner] = React.useState(props.initialData);

    return (
      <SectionContainer title="Cookie Banner Manager" onSave={() => props.onSave(cookieBanner)} isLoading={props.isSaving}>
          <ToggleSwitch label="Enable Cookie Banner" checked={cookieBanner.enabled} onChange={c => setCookieBanner({...cookieBanner, enabled: c})} />
          <Input label="Title" value={cookieBanner.title} onChange={e => setCookieBanner({...cookieBanner, title: e.target.value})} />
          <TextArea label="Message" value={cookieBanner.message} onChange={e => setCookieBanner({...cookieBanner, message: e.target.value})} rows={3} />
          <div className="flex gap-4">
              <Input label="Accept Button Text" value={cookieBanner.acceptButtonText} onChange={e => setCookieBanner({...cookieBanner, acceptButtonText: e.target.value})} />
              <Input label="Decline Button Text" value={cookieBanner.declineButtonText} onChange={e => setCookieBanner({...cookieBanner, declineButtonText: e.target.value})} />
          </div>
      </SectionContainer>
    );
});


type AdminSettingsPanelProps = {
  activeSection: AdminPanel;
  posts: Post[];
  processingPosts: ProcessingPost[];
  heroSlides: HeroSlide[];
  aboutConfig: AboutConfig;
  logoUrl: string;
  faviconUrl: string;
  footerConfig: FooterConfig;
  processingConfig: ProcessingConfig;
  licenseConfig: LicenseConfig;
  legalNoticeConfig: LegalNoticeConfig;
  cookieBannerConfig: CookieBannerConfig;
};

const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = (props) => {
    const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});

    const handleSave = async (section: string, data: any) => {
        setIsSaving(prev => ({ ...prev, [section]: true }));
        try {
            switch (section) {
                case 'global': {
                    let finalLogoUrl = data.logoUrl;
                    let finalFaviconUrl = data.faviconUrl;
                    if (data.logoFile) { const u = await uploadFile(data.logoFile, 'settings'); finalLogoUrl = u.url; }
                    if (data.faviconFile) { const u = await uploadFile(data.faviconFile, 'settings'); finalFaviconUrl = u.url; }
                    await saveSettings('global', { logoUrl: finalLogoUrl, faviconUrl: finalFaviconUrl });
                    break;
                }
                case 'hero': {
                    const updatedSlides = await Promise.all(data.map(async (slide: any, index: number) => {
                        const file = slide.tempFile;
                        if (file) {
                            const slideUpload = await uploadFile(file, 'hero-slides');
                            const { tempFile, ...rest } = slide;
                            return { ...rest, imageUrl: slideUpload.url, order: index };
                        }
                        return { ...slide, order: index };
                    }));
                    await saveSettings('heroSlides', { slides: updatedSlides });
                    break;
                }
                case 'about': {
                    let finalAbout = { ...data.about };
                    if (data.aboutImageFile) {
                        const aboutImg = await uploadFile(data.aboutImageFile, 'settings'); finalAbout.imageUrl = aboutImg.url;
                    }
                    await saveSettings('about', finalAbout);
                    break;
                }
                case 'articlesPage':
                    await saveSettings('processing', data);
                    break;
                case 'footer':
                    await saveSettings('footer', data);
                    break;
                case 'license':
                    await saveSettings('license', data);
                    break;
                case 'legalNotice':
                    await saveSettings('legalNotice', data);
                    break;
                case 'cookieBanner':
                    await saveSettings('cookieBanner', data);
                    break;
            }
            alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
        } catch (error) {
            console.error(`Failed to save ${section} settings:`, error);
            alert(`Error saving ${section} settings. Check console for details.`);
        } finally {
            setIsSaving(prev => ({ ...prev, [section]: false }));
        }
    };

    switch(props.activeSection) {
        case 'global':
          return <GlobalSettingsForm initialData={{ logoUrl: props.logoUrl, faviconUrl: props.faviconUrl }} onSave={(data) => handleSave('global', data)} isSaving={isSaving['global']} />;
        case 'hero':
          return <HeroSettingsForm initialData={props.heroSlides} allPosts={{posts: props.posts, processingPosts: props.processingPosts}} onSave={(data) => handleSave('hero', data)} isSaving={isSaving['hero']} />;
        case 'about':
          return <AboutSettingsForm initialData={props.aboutConfig} onSave={(data) => handleSave('about', data)} isSaving={isSaving['about']} />;
        case 'articlesPage':
          return <ArticlesPageSettingsForm initialData={props.processingConfig} onSave={(data) => handleSave('articlesPage', data)} isSaving={isSaving['articlesPage']} />;
        case 'footer':
          return <FooterSettingsForm initialData={props.footerConfig} onSave={(data) => handleSave('footer', data)} isSaving={isSaving['footer']} />;
        case 'license':
          return <LicenseSettingsForm initialData={props.licenseConfig} onSave={(data) => handleSave('license', data)} isSaving={isSaving['license']} />;
        case 'legalNotice':
          return <LegalNoticeSettingsForm initialData={props.legalNoticeConfig} onSave={(data) => handleSave('legalNotice', data)} isSaving={isSaving['legalNotice']} />;
        case 'cookieBanner':
          return <CookieBannerSettingsForm initialData={props.cookieBannerConfig} onSave={(data) => handleSave('cookieBanner', data)} isSaving={isSaving['cookieBanner']} />;
        default:
          return null;
    }
};

// --- END: Admin Settings Forms Refactor ---

const ImageOfTheDayView: React.FC = () => {
    const [date, setDate] = React.useState(new Date());
    const [activeTab, setActiveTab] = React.useState<'nasa' | 'astrobin'>('nasa');

    const [nasaApod, setNasaApod] = React.useState<APOD | null>(null);
    const [isNasaLoading, setIsNasaLoading] = React.useState(true);
    const [nasaError, setNasaError] = React.useState<string | null>(null);

    const [astrobinIotd, setAstrobinIotd] = React.useState<AstrobinImage | null>(null);
    const [isAstrobinLoading, setIsAstrobinLoading] = React.useState(true);
    const [astrobinError, setAstrobinError] = React.useState<string | null>(null);
    const [astrobinOffset, setAstrobinOffset] = React.useState(0);

    const handleDateChange = (newDate: Date) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        if (newDate > today) return;
        setDate(newDate);
    };

    const fetchNasaData = React.useCallback(() => {
        setIsNasaLoading(true);
        setNasaError(null);
        fetchImageOfTheDay(date)
            .then(setNasaApod)
            .catch(err => setNasaError(err.message))
            .finally(() => setIsNasaLoading(false));
    }, [date]);

    const fetchAstrobinData = React.useCallback(() => {
        setIsAstrobinLoading(true);
        setAstrobinError(null);
        fetchAstrobinImageOfTheDay(astrobinOffset)
            .then(setAstrobinIotd)
            .catch(err => setAstrobinError(err.message))
            .finally(() => setIsAstrobinLoading(false));
    }, [astrobinOffset]);

    React.useEffect(() => {
        fetchNasaData();
    }, [fetchNasaData]);

    React.useEffect(() => {
        fetchAstrobinData();
    }, [fetchAstrobinData]);

    const TabButton = ({ id, label }: { id: 'nasa' | 'astrobin', label: string }) => (
        <button
          onClick={() => setActiveTab(id)}
          className={`px-4 py-2 rounded-md font-semibold transition-colors ${activeTab === id ? 'bg-primary text-white' : 'bg-surface hover:bg-border'}`}
        >
          {label}
        </button>
    );

    return (
        <div className="space-y-8">
            <header className="py-8 text-center border-b border-border">
                <h1 className="text-4xl font-display font-bold">Image Of The Day</h1>
                <p className="mt-2 text-text-secondary max-w-2xl mx-auto">Discover daily marvels from NASA and the talented community at Astrobin.</p>
            </header>

            <div className="flex justify-center gap-2 p-2 bg-background rounded-lg border border-border w-fit mx-auto">
                <TabButton id="nasa" label="NASA APOD" />
                <TabButton id="astrobin" label="Astrobin IOTD" />
            </div>

            {activeTab === 'nasa' && (
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-center items-center gap-2">
                        <Button onClick={() => handleDateChange(new Date(date.setDate(date.getDate() - 1)))} variant="secondary"><ChevronLeft size={16}/></Button>
                        <Input type="date" value={date.toISOString().split('T')[0]} onChange={e => handleDateChange(new Date(e.target.value))} className="w-fit text-center" />
                        <Button onClick={() => handleDateChange(new Date(date.setDate(date.getDate() + 1)))} variant="secondary"><ChevronRight size={16}/></Button>
                    </div>
                    {isNasaLoading ? <div className="text-center p-8">Loading NASA's Image of the Day...</div> : nasaError ? <div className="text-center p-8 text-red-400">{nasaError}</div> : nasaApod && (
                        <div className="bg-surface border border-border p-6 rounded-lg">
                            <h2 className="text-2xl font-display font-bold mb-2">{nasaApod.title}</h2>
                            <p className="text-sm text-text-secondary mb-4">By: {nasaApod.copyright || 'NASA'}</p>
                            {nasaApod.media_type === 'image' ? <img src={nasaApod.hdurl || nasaApod.url} alt={nasaApod.title} className="w-full rounded-md" /> : <iframe src={nasaApod.url} className="w-full aspect-video rounded-md" />}
                            <p className="mt-4 text-text-secondary leading-relaxed">{nasaApod.explanation}</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'astrobin' && (
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex justify-center items-center gap-2">
                        <Button onClick={() => setAstrobinOffset(astrobinOffset + 1)} variant="secondary"><ChevronLeft size={16}/> Previous Day</Button>
                        <span className="font-semibold text-lg w-48 text-center">
                            {astrobinOffset === 0 ? "Today" : `${astrobinOffset} day${astrobinOffset > 1 ? 's' : ''} ago`}
                        </span>
                        <Button onClick={() => setAstrobinOffset(Math.max(0, astrobinOffset - 1))} variant="secondary" disabled={astrobinOffset === 0}>Next Day <ChevronRight size={16}/></Button>
                    </div>
                     {isAstrobinLoading ? <div className="text-center p-8">Loading Astrobin's Image of the Day...</div> : astrobinError ? <div className="text-center p-8 text-red-400">{astrobinError}</div> : astrobinIotd && (
                        <div className="bg-surface border border-border p-6 rounded-lg">
                            <h2 className="text-2xl font-display font-bold mb-2">{astrobinIotd.title}</h2>
                            <p className="text-sm text-text-secondary mb-4">By: {astrobinIotd.user}</p>
                            <a href={astrobinIotd.url_gallery} target="_blank" rel="noopener noreferrer">
                                <img src={astrobinIotd.url_hd} alt={astrobinIotd.title} className="w-full rounded-md" />
                            </a>
                            <div className="mt-4 text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: astrobinIotd.description }}></div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};



const AstroIndexView: React.FC = () => {
    const [locationSource, setLocationSource] = React.useState<'current' | 'saintEtienne' | 'pradelles' | ''>('');
    const [coordinates, setCoordinates] = React.useState<{ lat: number; lon: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = React.useState(false);
    const [locationError, setLocationError] = React.useState<string | null>(null);

    const [selectedDate, setSelectedDate] = React.useState(new Date());

    const [mappedAstroData, setMappedAstroData] = React.useState<MappedAstronomyData | null>(null);
    const [isLoadingAstronomy, setIsLoadingAstronomy] = React.useState(false);
    const [astronomyError, setAstronomyError] = React.useState<string | null>(null);

    const [weatherForecast, setWeatherForecast] = React.useState<AstroForecastHour[] | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = React.useState(false);
    const [weatherError, setWeatherError] = React.useState<string | null>(null);

    const [nightlyForecast, setNightlyForecast] = React.useState<NightlyForecast[] | null>(null);
    const [isLoadingNightly, setIsLoadingNightly] = React.useState(false);
    const [nightlyError, setNightlyError] = React.useState<string | null>(null);

    const [currentBortle, setCurrentBortle] = React.useState<number | null>(null);

    const PRESET_LOCATIONS = {
        saintEtienne: { lat: 43.79, lon: 4.72, name: "Saint-Étienne-du-Grès (13103)", bortle: 4 },
        pradelles: { lat: 44.77, lon: 3.88, name: "Pradelles (43420)", bortle: 2 }
    };

    // Fetch astronomical data when location or date changes
    React.useEffect(() => {
        if (coordinates) {
            setIsLoadingAstronomy(true);
            setAstronomyError(null);
            setMappedAstroData(null);

            fetchAstronomyData(coordinates.lat, coordinates.lon, selectedDate)
                .then(data => setMappedAstroData(mapAstronomyData(data)))
                .catch(err => {
                    setAstronomyError("Failed to load astronomical data. The API may be unavailable.");
                    console.error(err);
                })
                .finally(() => setIsLoadingAstronomy(false));
        }
    }, [coordinates, selectedDate]);

    // Fetch weather forecast *after* astronomical data is available
    React.useEffect(() => {
        if (coordinates && mappedAstroData?.fullNightBegins && mappedAstroData?.fullNightEnds) {
            setIsLoadingWeather(true);
            setWeatherError(null);
            setWeatherForecast(null);

            fetchAstroForecast(coordinates.lat, coordinates.lon, selectedDate)
                .then(data => {
                    const moonIllum = mappedAstroData.moonIllumination ? parseFloat(mappedAstroData.moonIllumination) : 0;
                    const windowData = mapAndFilterImagingWindow(data, mappedAstroData.fullNightBegins, mappedAstroData.fullNightEnds, selectedDate, moonIllum);
                    setWeatherForecast(windowData);
                })
                .catch(err => {
                    setWeatherError("Failed to load weather forecast. The API may be unavailable or the location is not supported.");
                    console.error(err);
                })
                .finally(() => setIsLoadingWeather(false));
        }
    }, [coordinates, mappedAstroData, selectedDate]);

    // Fetch nightly forecast (14 days) when location changes
    React.useEffect(() => {
        if (coordinates) {
            setIsLoadingNightly(true);
            setNightlyError(null);
            setNightlyForecast(null);

            fetchNightlyForecast(coordinates.lat, coordinates.lon)
                .then(data => setNightlyForecast(mapNightlyForecast(data)))
                .catch(err => {
                    setNightlyError("Failed to load 14-day forecast.");
                    console.error(err);
                })
                .finally(() => setIsLoadingNightly(false));
        }
    }, [coordinates]);

    const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const source = e.target.value as typeof locationSource;
        setLocationSource(source);
        setCoordinates(null);
        setLocationError(null);
        setCurrentBortle(null);

        if (source === 'current') {
            setIsLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoordinates({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                    setCurrentBortle(5); // Default estimate for current location
                    setIsLoadingLocation(false);
                },
                (err) => {
                    setLocationError('Geolocation failed. Please enable location permissions in your browser settings.');
                    setIsLoadingLocation(false);
                }
            );
        } else if (source === 'saintEtienne') {
            setCoordinates(PRESET_LOCATIONS.saintEtienne);
            setCurrentBortle(PRESET_LOCATIONS.saintEtienne.bortle);
        } else if (source === 'pradelles') {
            setCoordinates(PRESET_LOCATIONS.pradelles);
            setCurrentBortle(PRESET_LOCATIONS.pradelles.bortle);
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxForecastDate = new Date(today);
    maxForecastDate.setDate(today.getDate() + 15);

    const handlePrevDay = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() - 1);
            return newDate;
        });
    };

    const handleNextDay = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + 1);
            return newDate;
        });
    };

    const isPrevDisabled = selectedDate.getTime() <= today.getTime();
    const isNextDisabled = selectedDate.getTime() >= maxForecastDate.getTime();

    const formatDateDisplay = (date: Date) => {
        const dateToCompare = new Date(date);
        dateToCompare.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        if (dateToCompare.getTime() === today.getTime()) return "Today";
        if (dateToCompare.getTime() === tomorrow.getTime()) return "Tomorrow";

        return date.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };


    return (
        <div className="space-y-8">
            <header className="py-8 text-center border-b border-border mb-8">
                <h1 className="text-4xl font-display font-bold">Astro Weather</h1>
                <p className="mt-2 text-text-secondary max-w-2xl mx-auto">Real-time stargazing and astrophotography conditions for your location.</p>
            </header>

            <div className="max-w-7xl mx-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                        <Select
                            label="Select Location Source"
                            value={locationSource}
                            onChange={handleLocationChange}
                        >
                            <option value="" disabled>-- Choose a location --</option>
                            <option value="current">My Current Location</option>
                            <option value="saintEtienne">{PRESET_LOCATIONS.saintEtienne.name}</option>
                            <option value="pradelles">{PRESET_LOCATIONS.pradelles.name}</option>
                        </Select>

                        {isLoadingLocation && <p className="text-text-secondary text-center">Fetching your location...</p>}
                        {locationError && <p className="text-red-400 text-center">{locationError}</p>}

                        {coordinates && (
                            <div className="bg-background border border-border p-4 rounded-md font-mono text-sm text-center">
                                <p>
                                    <span className="text-text-secondary">Latitude:</span> {coordinates.lat.toFixed(4)}
                                    <span className="text-text-secondary mx-2">|</span>
                                    <span className="text-text-secondary">Longitude:</span> {coordinates.lon.toFixed(4)}
                                </p>
                                {currentBortle && (
                                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-center gap-2">
                                        <span className="text-text-secondary">Light Pollution:</span>
                                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                                            currentBortle <= 3 ? 'bg-blue-900 text-blue-200' :
                                            currentBortle <= 5 ? 'bg-yellow-900 text-yellow-200' :
                                            'bg-red-900 text-red-200'
                                        }`}>
                                            Bortle {currentBortle}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4 flex flex-col justify-center">
                        <label className="block text-sm font-medium text-text-secondary">Forecast Date</label>
                         <div className="flex items-center justify-between gap-2">
                            <Button
                                onClick={handlePrevDay}
                                disabled={isPrevDisabled}
                                variant="secondary"
                                size="sm"
                                className="!p-2"
                                aria-label="Previous day"
                            >
                                <ChevronLeft size={20} />
                            </Button>
                            <span className="font-semibold text-center text-base sm:text-lg w-full tabular-nums">
                                {formatDateDisplay(selectedDate)}
                            </span>
                            <Button
                                onClick={handleNextDay}
                                disabled={isNextDisabled}
                                variant="secondary"
                                size="sm"
                                className="!p-2"
                                aria-label="Next day"
                            >
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {coordinates && (
                    <React.Suspense fallback={<div className="text-center py-10 text-text-secondary">Loading forecast...</div>}>
                    <NightlyForecastView
                        forecast={nightlyForecast || []}
                        isLoading={isLoadingNightly}
                        error={nightlyError}
                        onSelectDate={setSelectedDate}
                        selectedDate={selectedDate}
                    />
                    </React.Suspense>
                )}

                {(isLoadingAstronomy || astronomyError || mappedAstroData) && (
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                        <h2 className="font-display font-bold text-lg flex items-center gap-2">
                            <Moon size={16}/> Astronomical Data
                        </h2>
                        {isLoadingAstronomy && <p className="text-text-secondary text-center">Loading astronomical data...</p>}
                        {astronomyError && <p className="text-red-400 text-center">{astronomyError}</p>}
                        {mappedAstroData && (
                           <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pt-2">
                                <AstroDataCard icon={<Sun size={24} />} label="Sunrise" value={mappedAstroData.sunrise} />
                                <AstroDataCard icon={<Sun size={24} />} label="Sunset" value={mappedAstroData.sunset} />
                                <AstroDataCard icon={<Moon size={24} />} label="Moonrise" value={mappedAstroData.moonrise} />
                                <AstroDataCard icon={<Moon size={24} />} label="Moonset" value={mappedAstroData.moonset} />
                                <AstroDataCard icon={<Zap size={24} />} label="Illumination" value={`${mappedAstroData.moonIllumination}%`} />
                                <AstroDataCard icon={<Moon size={24} />} label="Moon Phase" value={mappedAstroData.moonPhase} />
                                <AstroDataCard icon={<Eye size={24} />} label="Darkness Begins" value={mappedAstroData.fullNightBegins} />
                                <AstroDataCard icon={<Eye size={24} />} label="Darkness Ends" value={mappedAstroData.fullNightEnds} />
                           </div>
                        )}
                    </div>
                )}

                {coordinates && (
                    <React.Suspense fallback={<div className="text-center py-10 text-text-secondary">Loading weather...</div>}>
                    <WeatherDisplayView
                        imagingWindowData={weatherForecast || []}
                        isLoading={isLoadingWeather}
                        error={weatherError}
                    />
                    </React.Suspense>
                )}
            </div>
        </div>
    );
};

const AladinLiteViewer: React.FC<{ ra: string; dec: string; fov?: number; name?: string }> = ({ ra, dec, fov = 2.0, name = '' }) => {
  const [containerId] = React.useState(() => `aladin-${Math.random().toString(36).substr(2, 9)}`);
  const aladinRef = React.useRef<any>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('[Aladin] Initializing with:', { ra, dec, fov, name, containerId });
    
    // Vérifier si les coordonnées sont valides
    if (!ra || !dec || ra === 'N/A' || dec === 'N/A') {
      console.log('[Aladin] Invalid coordinates, skipping');
      setError('No coordinates available');
      return;
    }
    
    // Parse RA and Dec
    const parseCoord = (coord: string) => {
      const parts = coord.split(/[:\s]+/);
      if (parts.length === 3) {
        const h = parseFloat(parts[0]);
        const m = parseFloat(parts[1]);
        const s = parseFloat(parts[2]);
        return h + m/60 + s/3600;
      }
      return parseFloat(coord);
    };

    const raDeg = parseCoord(ra) * 15;
    const decDeg = parseCoord(dec);
    
    if (isNaN(raDeg) || isNaN(decDeg)) {
      console.error('[Aladin] Failed to parse coordinates:', { ra, dec });
      setError('Invalid coordinates');
      return;
    }
    
    console.log('[Aladin] Parsed coords:', { raDeg, decDeg });

    const initAladin = () => {
      console.log('[Aladin] initAladin called');
      console.log('[Aladin] window.A:', !!(window as any).A);
      
      const container = document.getElementById(containerId);
      console.log('[Aladin] container:', container ? 'Found' : 'NOT FOUND');
      
      if (container && (window as any).A && !aladinRef.current) {
        const A = (window as any).A;
        
        try {
          console.log('[Aladin] Calling A.aladin()');
          aladinRef.current = A.aladin(`#${containerId}`, {
            target: `${raDeg} ${decDeg}`,
            fov: fov,
            survey: 'P/DSS2/color',
            showFullscreenControl: false,
          });
          
          // Ajouter un overlay avec le nom de l'objet
          if (name && aladinRef.current.addCatalog) {
            try {
              const catalog = A.catalog({
                name: name,
                color: '#ff6b35',
              });
              
              // Créer une source avec les coordonnées
              const source = A.source(raDeg, decDeg, {
                name: name,
                ra: ra,
                dec: dec,
              });
              
              catalog.addSources([source]);
              aladinRef.current.addCatalog(catalog);
              console.log('[Aladin] Catalog added for:', name);
            } catch (catalogErr) {
              console.warn('[Aladin] Could not add catalog:', catalogErr);
            }
          }
          
          setIsLoaded(true);
          console.log('[Aladin] Instance created successfully');
        } catch (err) {
          console.error('[Aladin] Error creating instance:', err);
          setError(String(err));
        }
      }
    };

    const loadAladin = () => {
      if ((window as any).A) {
        console.log('[Aladin] A already available');
        initAladin();
      } else {
        console.log('[Aladin] Loading script...');
        const script = document.createElement('script');
        script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
        script.charset = 'utf-8';
        script.async = true;
        script.onload = () => {
          console.log('[Aladin] Script loaded');
          // Attendre un peu que le script s'initialise complètement
          setTimeout(initAladin, 500);
        };
        script.onerror = () => {
          console.error('[Aladin] Failed to load script');
          setError('Failed to load Aladin Lite');
        };
        document.head.appendChild(script);
      }
    };

    // Délai plus long pour s'assurer que tout est prêt
    const timer = setTimeout(() => {
      loadAladin();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [ra, dec, fov, name, containerId]);

  const handleReset = () => {
    if (aladinRef.current) {
      aladinRef.current.setFov(fov);
    }
  };

  // Si erreur ou pas de coordonnées, ne rien afficher
  if (error) {
    return (
      <div className="text-text-secondary text-sm italic">
        Sky map unavailable — {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-secondary">Sky View (FOV: {fov}°)</h3>
        {isLoaded && (
          <button 
            onClick={handleReset}
            className="text-xs text-primary hover:underline flex items-center gap-1"
            title="Reset to initial view"
          >
            <RotateCcw size={12}/> Reset
          </button>
        )}
      </div>
      
      <div 
        id={containerId}
        style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}
        className="border border-border relative"
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Loading sky map...
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 text-xs text-text-secondary">
        <span>RA: {ra} | Dec: {dec}</span>
        <a 
          href={`https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${encodeURIComponent(ra)}${encodeURIComponent(dec)}&Radius=1m`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1"
        >
          SIMBAD <ExternalLink size={10}/>
        </a>
      </div>
    </div>
  );
};


export default App;
