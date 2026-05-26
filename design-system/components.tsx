import React, { ReactNode } from 'react';

// --- Button Primitives ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  isLoading,
  disabled,
  size = 'md',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyle = "font-sans font-semibold rounded-[10px] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary: "bg-[#3B82F6] text-white hover:bg-[#60A5FA] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] focus-visible:ring-[#3B82F6]",
    secondary: "bg-[#1F2937] text-[#e8eaf6] hover:bg-[#374151] focus-visible:ring-[#3B82F6]",
    danger: "bg-[#EF4444] text-white hover:bg-red-600 focus-visible:ring-[#EF4444]",
    ghost: "bg-transparent text-[#8e9aaf] hover:bg-white/5 hover:text-[#e8eaf6] focus-visible:ring-[#3B82F6]",
    accent: "bg-[#3b82f6] text-white hover:bg-[#2563eb] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] focus-visible:ring-[#3b82f6]",
  };

  return (
    <button
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};

// --- Icon Button ---

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'ghost' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: "text-[#8e9aaf] hover:bg-white/5 hover:text-[#e8eaf6]",
    ghost: "text-[#6b7280] hover:bg-white/5 hover:text-[#e8eaf6]",
    danger: "text-[#EF4444] hover:bg-red-500/10",
  };

  return (
    <button
      aria-label={label}
      className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-150 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};

// --- Card Primitives ---

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: "bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-[14px] p-6 transition-all duration-200 hover:border-[rgba(148,163,184,0.25)]",
    elevated: "bg-[#111827] border border-[rgba(148,163,184,0.12)] rounded-[14px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
    glass: "bg-[rgba(11,16,33,0.7)] backdrop-blur-[12px] border border-[rgba(255,255,255,0.08)] rounded-[18px] p-6",
  };

  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

// --- Form Primitives ---

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, className = '', ...props }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-medium text-[#8e9aaf] uppercase tracking-wider mb-1.5">
        {label}
      </label>
    )}
    <input
      className={`w-full bg-[#0a0f1a] border rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] placeholder-[#6b7280] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] ${
        error ? 'border-[#EF4444] focus:ring-[rgba(239,68,68,0.25)] focus:border-[#EF4444]' : 'border-[rgba(148,163,184,0.12)] hover:border-[rgba(148,163,184,0.25)]'
      } ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    {helperText && !error && <p className="mt-1 text-xs text-[#6b7280]">{helperText}</p>}
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, helperText, className = '', ...props }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-medium text-[#8e9aaf] uppercase tracking-wider mb-1.5">
        {label}
      </label>
    )}
    <textarea
      className={`w-full bg-[#0a0f1a] border rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] placeholder-[#6b7280] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] min-h-[120px] resize-y leading-relaxed ${
        error ? 'border-[#EF4444]' : 'border-[rgba(148,163,184,0.12)] hover:border-[rgba(148,163,184,0.25)]'
      } ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    {helperText && !error && <p className="mt-1 text-xs text-[#6b7280]">{helperText}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, helperText, className = '', children, ...props }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-medium text-[#8e9aaf] uppercase tracking-wider mb-1.5">
        {label}
      </label>
    )}
    <select
      className={`w-full bg-[#0a0f1a] border rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] appearance-none cursor-pointer ${
        error ? 'border-[#EF4444]' : 'border-[rgba(148,163,184,0.12)] hover:border-[rgba(148,163,184,0.25)]'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
    {helperText && !error && <p className="mt-1 text-xs text-[#6b7280]">{helperText}</p>}
  </div>
);

// --- Badge ---

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'info';
  children: ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: "bg-[#1F2937] text-[#e8eaf6]",
    primary: "bg-[rgba(59,130,246,0.15)] text-[#3B82F6]",
    success: "bg-[rgba(16,185,129,0.15)] text-[#10B981]",
    warning: "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]",
    danger: "bg-[rgba(239,68,68,0.15)] text-[#EF4444]",
    accent: "bg-[rgba(59,130,246,0.15)] text-[#3b82f6]",
    info: "bg-[rgba(6,182,212,0.15)] text-[#06B6D4]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// --- Modal ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-[480px]',
    md: 'max-w-[640px]',
    lg: 'max-w-[900px]',
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] p-4 animate-[fadeIn_0.2s_ease-out]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[8px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`absolute left-1/2 top-[5vh] -translate-x-1/2 max-h-[90vh] w-full ${sizeClasses[size]} bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden animate-[scaleIn_0.25s_ease-out] flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(148,163,184,0.12)] sticky top-0 bg-[#1a2238] z-10">
            <h2 id="modal-title" className="text-lg font-semibold font-[Space_Grotesk]">{title}</h2>
            <IconButton
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              label="Close"
              variant="ghost"
              onClick={onClose}
            />
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Bottom Sheet (Mobile Modal) ---

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children, title }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] animate-[fadeIn_0.2s_ease-out]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[8px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-[#1a2238] border-t border-[rgba(148,163,184,0.12)] rounded-t-[18px] shadow-[0_-8px_24px_rgba(0,0,0,0.5)] overflow-hidden animate-[slideUp_0.3s_ease-out] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[rgba(148,163,184,0.25)]" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-6 py-3">
            <h2 className="text-lg font-semibold font-[Space_Grotesk]">{title}</h2>
            <IconButton
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              label="Close"
              variant="ghost"
              onClick={onClose}
            />
          </div>
        )}
        <div className="px-6 pb-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Toggle Switch ---

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, className = '' }) => (
  <label className={`flex items-center justify-between cursor-pointer gap-4 ${className}`}>
    {label && <span className="text-sm text-[#8e9aaf]">{label}</span>}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#3B82F6]' : 'bg-[rgba(148,163,184,0.25)]'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </label>
);

// --- Page Header ---

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="pt-12 pb-6">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold font-[Space_Grotesk] text-[#e8eaf6] tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-[#8e9aaf]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  </div>
);

// --- Container ---

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, className = '' }) => (
  <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10 max-w-[1200px] xl:max-w-[1400px] ${className}`}>
    {children}
  </div>
);

// --- Skeleton Loader ---

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`bg-[#111827] rounded-[10px] animate-pulse ${className}`} />
);

// --- Empty State ---

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="mb-4 text-[#6b7280]">{icon}</div>}
    <h3 className="text-lg font-semibold text-[#e8eaf6] font-[Space_Grotesk]">{title}</h3>
    {description && <p className="mt-2 text-sm text-[#8e9aaf] max-w-sm">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// --- Divider ---

export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-px bg-[rgba(148,163,184,0.12)] ${className}`} />
);

// --- Tooltip (simple) ---

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#111827] text-xs text-[#e8eaf6] rounded-[10px] border border-[rgba(148,163,184,0.12)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-[120] shadow-lg pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#111827]" />
    </div>
  </div>
);

export default {
  Button,
  IconButton,
  Card,
  Input,
  TextArea,
  Select,
  Badge,
  Modal,
  BottomSheet,
  Toggle,
  PageHeader,
  Container,
  Skeleton,
  EmptyState,
  Divider,
  Tooltip,
};
