import React from 'react';
import { Button, IconButton, Container } from './components';

// Navigation items for AstroCapture v2
export const NAV_ITEMS = [
  { id: 'gallery', label: 'Gallery', labelFr: 'Galerie', icon: 'Image', view: 'GALLERY' },
  { id: 'equipment', label: 'Equipment', labelFr: 'Matériel', icon: 'Telescope', view: 'EQUIPMENT' },
  { id: 'journal', label: 'Journal', labelFr: 'Journal', icon: 'BookOpen', view: 'JOURNAL' },
  { id: 'hal', label: 'Ask Hal', labelFr: 'Demander à Hal', icon: 'Sparkles', view: 'ASK_HAL' },
] as const;

// Astro Suite submenu items
export const ASTRO_SUITE_ITEMS = [
  { id: 'dashboard', label: 'Astro Index', labelFr: 'Index Astro', icon: 'LayoutDashboard', view: 'ASTRO_INDEX' },
  { id: 'targets', label: 'Best Targets', labelFr: 'Meilleures Cibles', icon: 'Target', view: 'BEST_TARGETS' },
  { id: 'planner', label: 'Planner', labelFr: 'Planificateur', icon: 'Calendar', view: 'OBSERVATION_PLANNER' },
] as const;

export type NavItem = typeof NAV_ITEMS[number];
export type NavId = NavItem['id'];

interface NavbarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  language?: 'en' | 'fr';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  isAdmin,
  onAdminClick,
  isLoggedIn,
  onLoginClick,
  onLogoutClick,
  language = 'en',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isAstroSuiteOpen, setIsAstroSuiteOpen] = React.useState(false);
  const astroSuiteRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close Astro Suite dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (astroSuiteRef.current && !astroSuiteRef.current.contains(event.target as Node)) {
        setIsAstroSuiteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getItemLabel = (item: NavItem | typeof ASTRO_SUITE_ITEMS[number]) => language === 'fr' ? item.labelFr : item.label;

  const activeItem = NAV_ITEMS.find(item => item.view === activeView);
  const activeAstroItem = ASTRO_SUITE_ITEMS.find(item => item.view === activeView);
  const isAstroSuiteActive = !!activeAstroItem;

  return (
    <>
      {/* Desktop + Mobile Top Bar */}
      <header
        className={`fixed top-0 left-0 right-0 h-16 z-50 transition-all duration-200 ${
          isScrolled
            ? 'bg-[rgba(6,8,17,0.95)] backdrop-blur-[12px] border-b border-[rgba(148,163,184,0.12)]'
            : 'bg-transparent'
        }`}
      >
        <Container className="flex items-center justify-between h-full">
          {/* Logo */}
          <button
            onClick={() => onNavigate('GALLERY')}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#3b82f6] flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" fill="white" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <span className="font-bold text-lg font-[Space_Grotesk] text-[#e8eaf6] group-hover:text-white transition-colors">
              AstroCapture
            </span>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.view)}
                className={`relative px-3 py-2 text-sm font-medium transition-colors duration-150 rounded-lg ${
                  activeView === item.view
                    ? 'text-[#e8eaf6]'
                    : 'text-[#8e9aaf] hover:text-[#e8eaf6] hover:bg-white/5'
                }`}
              >
                {getItemLabel(item)}
                {activeView === item.view && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[#3B82F6] rounded-full" />
                )}
              </button>
            ))}

            {/* Astro Suite Dropdown */}
            <div ref={astroSuiteRef} className="relative">
              <button
                onClick={() => setIsAstroSuiteOpen(!isAstroSuiteOpen)}
                className={`relative px-3 py-2 text-sm font-medium transition-colors duration-150 rounded-lg flex items-center gap-1 ${
                  isAstroSuiteActive
                    ? 'text-[#e8eaf6]'
                    : 'text-[#8e9aaf] hover:text-[#e8eaf6] hover:bg-white/5'
                }`}
              >
                {language === 'fr' ? 'Suite Astro' : 'Astro Suite'}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isAstroSuiteOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {isAstroSuiteActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[#3B82F6] rounded-full" />
                )}
              </button>

              {/* Dropdown Menu */}
              {isAstroSuiteOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl shadow-xl shadow-black/30 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                  {ASTRO_SUITE_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.view);
                        setIsAstroSuiteOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeView === item.view
                          ? 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]'
                          : 'text-[#e8eaf6] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {getItemLabel(item)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Admin */}
            {isAdmin && onAdminClick && (
              <IconButton
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>}
                label="Settings"
                variant="ghost"
                onClick={onAdminClick}
              />
            )}

            {/* Auth */}
            {isLoggedIn ? (
              <IconButton
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>}
                label="Logout"
                variant="ghost"
                onClick={onLogoutClick}
              />
            ) : (
              <Button variant="ghost" size="sm" onClick={onLoginClick}>
                {language === 'fr' ? 'Connexion' : 'Login'}
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-[#8e9aaf] hover:text-[#e8eaf6] rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-[8px] z-40 lg:hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-[280px] bg-[#1a2238] border-l border-[rgba(148,163,184,0.12)] z-50 lg:hidden animate-[slideUp_0.25s_ease-out] overflow-y-auto">
            <div className="p-4 space-y-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.view);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    activeView === item.view
                      ? 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]'
                      : 'text-[#e8eaf6] hover:bg-white/5'
                  }`}
                >
                  {getItemLabel(item)}
                </button>
              ))}

              {/* Mobile Astro Suite Section */}
              <div className="px-4 py-2 text-xs font-semibold text-[#8e9aaf] uppercase tracking-wider mt-2">
                {language === 'fr' ? 'Suite Astro' : 'Astro Suite'}
              </div>
              {ASTRO_SUITE_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.view);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors ml-2 ${
                    activeView === item.view
                      ? 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]'
                      : 'text-[#e8eaf6] hover:bg-white/5'
                  }`}
                >
                  {getItemLabel(item)}
                </button>
              ))}
              <Divider className="my-4" />
              
              {isAdmin && onAdminClick && (
                <button
                  onClick={() => {
                    onAdminClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-[#8e9aaf] hover:bg-white/5 transition-colors"
                >
                  {language === 'fr' ? 'Paramètres' : 'Settings'}
                </button>
              )}
              
              {isLoggedIn && onLogoutClick ? (
                <button
                  onClick={() => {
                    onLogoutClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-[#EF4444] hover:bg-red-500/5 transition-colors"
                >
                  {language === 'fr' ? 'Déconnexion' : 'Logout'}
                </button>
              ) : onLoginClick ? (
                <button
                  onClick={() => {
                    onLoginClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-[#3B82F6] hover:bg-[rgba(59,130,246,0.1)] transition-colors"
                >
                  {language === 'fr' ? 'Connexion' : 'Login'}
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
};

// Re-export Divider from components for convenience
import { Divider } from './components';
export { Divider };
