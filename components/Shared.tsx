
// FIX: Imported `useState` from React to resolve usage error.
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Heading2, Pilcrow,
  ImageIcon, Upload, Trash2, X, GripVertical, File, AudioWaveform,
  Sparkles, ChevronLeft, ChevronRight, ArrowUp, Twitter, Facebook,
  Instagram, Copy, Cookie, FileText, Download, Share2
} from 'lucide-react';

// --- Shared UI Primitives ---

const ToolbarButton: React.FC<{ onClick: () => void; children: React.ReactNode; title: string }> = ({ onClick, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-2 rounded-md hover:bg-border focus:bg-border text-text-secondary hover:text-text"
    title={title}
  >
    {children}
  </button>
);

// --- Visual Elements ---

export const StarBackground = () => {
  // Static rendering of stars for performance, created once
  const stars = React.useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
      size: `${Math.random() * 1.5 + 0.5}px`
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="star animate-twinkle"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

// --- Basic UI ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  size?: 'sm' | 'md'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  isLoading,
  disabled,
  size = 'md',
  ...props
}) => {
  const baseStyle = "font-sans font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background";

  const sizeStyles = {
      md: "px-4 py-2",
      sm: "px-2 py-1 text-sm"
  }

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover focus:ring-primary",
    secondary: "bg-secondary text-text hover:bg-secondary-hover focus:ring-primary",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "bg-transparent text-text-secondary hover:bg-surface hover:text-text focus:ring-primary"
  };

  const finalVariant = variants[variant] || variants.primary;

  return (
    <button
      className={`${baseStyle} ${sizeStyles[size]} ${finalVariant} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </>
      ) : children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label ? (
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    ) : null}
    <input
      className={`w-full bg-background border border-border p-2.5 text-text rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${className}`}
      aria-label={label || undefined}
      {...props}
    />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select: React.FC<SelectProps> = ({ label, className = '', children, ...props }) => (
  <div className="w-full">
    {label ? (
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    ) : null}
    <select
      className={`w-full bg-background border border-border p-2.5 text-text rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${className}`}
      aria-label={label || undefined}
      {...props}
    >
      {children}
    </select>
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label ? (
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    ) : null}
    <textarea
      className={`w-full bg-background border border-border p-2.5 text-text rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors min-h-[120px] ${className}`}
      aria-label={label || undefined}
      {...props}
    />
  </div>
);

export const RichTextEditor: React.FC<{
  label?: string;
  value: string;
  onChange: (html: string) => void;
}> = ({ label, value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);

    if (command === 'createLink' && editorRef.current) {
      const links = editorRef.current.getElementsByTagName('a');
      for (const link of links) {
        if (!link.target) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      }
    }

    editorRef.current?.focus();
    handleInput();
  };

  const handleLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
        execCmd('createLink', url);
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>}
      <div className="border border-border rounded-lg bg-surface">
        <div className="flex flex-wrap items-center gap-1 p-1 border-b border-border">
          <ToolbarButton onClick={() => execCmd('bold')} title="Bold"><Bold size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('italic')} title="Italic"><Italic size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('underline')} title="Underline"><Underline size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('insertUnorderedList')} title="Unordered List"><List size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('insertOrderedList')} title="Ordered List"><ListOrdered size={16} /></ToolbarButton>
          <ToolbarButton onClick={handleLink} title="Insert Link"><LinkIcon size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('formatBlock', '<h2>')} title="Heading 2"><Heading2 size={16} /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('formatBlock', '<p>')} title="Paragraph"><Pilcrow size={16} /></ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="p-3 focus:outline-none min-h-[250px] prose-styles"
        />
      </div>
    </div>
  );
};


export const ImageUploader: React.FC<{
    label: string;
    currentImageUrl: string;
    imageFile: File | null;
    onUrlChange: (url: string) => void;
    onFileChange: (file: File | null) => void;
    id: string;
}> = ({ label, currentImageUrl, imageFile, onUrlChange, onFileChange, id }) => {
    const [preview, setPreview] = useState<string | null>(currentImageUrl);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (imageFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(imageFile);
        } else {
            setPreview(currentImageUrl);
        }
    }, [currentImageUrl, imageFile]);

    const handleFileChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileChange(file);
        if (file) {
            onUrlChange('');
        }
    };

    const handleUrlChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUrlChange(e.target.value);
        if (e.target.value) {
            onFileChange(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveImage = () => {
        onUrlChange('');
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
            <div className="flex items-start gap-4 p-3 border border-border bg-background rounded-lg">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-24 h-24 object-contain border border-border flex-shrink-0 bg-black rounded-md" />
                ) : (
                    <div className="w-24 h-24 bg-surface border border-dashed border-border flex items-center justify-center flex-shrink-0 rounded-md">
                        <ImageIcon size={32} className="text-text-secondary" />
                    </div>
                )}
                <div className="flex-grow space-y-2 w-full">
                    <Input
                        value={currentImageUrl}
                        onChange={handleUrlChangeInternal}
                        placeholder="Paste image URL here..."
                    />
                    <div className="flex items-center gap-2">
                        <div className="flex-grow h-px bg-border"></div>
                        <span className="text-xs text-text-secondary">OR</span>
                        <div className="flex-grow h-px bg-border"></div>
                    </div>
                    <div className="flex items-start gap-2">
                        <label htmlFor={id} className="w-full cursor-pointer block">
                            <div className="w-full text-center px-4 py-2 bg-secondary text-text hover:bg-secondary-hover rounded-md transition-all flex justify-center items-center gap-2">
                                <Upload size={16} />
                                <span className="truncate max-w-xs text-sm">{imageFile ? imageFile.name : 'Upload a file'}</span>
                            </div>
                            <input id={id} ref={fileInputRef} type="file" className="hidden" onChange={handleFileChangeInternal} accept="image/*" />
                        </label>
                        {preview && (
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="p-2 bg-red-600 text-white hover:bg-red-700 border border-transparent rounded-md transition-all flex justify-center items-center flex-shrink-0"
                                title="Remove current image"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const FileUploader: React.FC<{
    label: string;
    currentFileUrl: string;
    file: File | null;
    onUrlChange: (url: string) => void;
    onFileChange: (file: File | null) => void;
    id: string;
    accept?: string;
    icon: React.ReactNode;
}> = ({ label, currentFileUrl, file, onUrlChange, onFileChange, id, accept, icon }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        onFileChange(selectedFile);
        if (selectedFile) onUrlChange('');
    };

    const handleUrlChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUrlChange(e.target.value);
        if (e.target.value) {
            onFileChange(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveFile = () => {
        onUrlChange('');
        onFileChange(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const hasFile = currentFileUrl || file;
    const displayName = file ? file.name : currentFileUrl ? currentFileUrl.split('/').pop()?.split('?')[0] : 'No file selected';

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
            <div className="flex items-start gap-4 p-3 border border-border bg-background rounded-lg">
                <div className="w-12 h-12 bg-surface border border-dashed border-border flex items-center justify-center flex-shrink-0 rounded-md">
                    {icon}
                </div>
                <div className="flex-grow space-y-2 w-full">
                    <Input value={currentFileUrl} onChange={handleUrlChangeInternal} placeholder="Paste file URL here..." />
                    <div className="flex items-center gap-2">
                        <div className="flex-grow h-px bg-border"></div>
                        <span className="text-xs text-text-secondary">OR</span>
                        <div className="flex-grow h-px bg-border"></div>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-secondary/50 p-2 rounded-md">
                        <p className="text-sm text-text-secondary truncate">{displayName}</p>
                        <div className="flex gap-1">
                            <label htmlFor={id} className="cursor-pointer p-1.5 bg-secondary text-text hover:bg-secondary-hover rounded-md transition-all">
                                <Upload size={14} />
                                <input id={id} ref={fileInputRef} type="file" className="hidden" onChange={handleFileChangeInternal} accept={accept} />
                            </label>
                            {hasFile && (
                                <button type="button" onClick={handleRemoveFile} className="p-1.5 bg-red-600 text-white hover:bg-red-700 rounded-md transition-all">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const DraggableListItem: React.FC<{
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  index: number;
  children: React.ReactNode;
}> = ({ onDragStart, onDragEnter, onDragEnd, index, children }) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      data-index={index}
      className="flex items-start gap-2 bg-background p-3 border border-border rounded-md group"
    >
      <div className="cursor-grab text-text-secondary/50 group-hover:text-text-secondary pt-1">
        <GripVertical size={18} />
      </div>
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
};


export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: ReactNode; title?: string }> = ({ isOpen, onClose, children, title }) => {
  const scrollableContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        if (scrollableContentRef.current) {
          scrollableContentRef.current.scrollTop = 0;
        }
      }, 0);

      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={scrollableContentRef}
        className="absolute left-1/2 -translate-x-1/2 top-[5vh] max-h-[90vh] bg-surface border border-border rounded-lg shadow-2xl w-full max-w-3xl overflow-y-auto"
      >
        <div className="bg-background/80 backdrop-blur-md text-text p-4 flex justify-between items-center border-b border-border sticky top-0 z-10">
           <h2 className="text-lg font-bold font-display">{title || 'System Window'}</h2>
           <button onClick={onClose} className="text-text-secondary hover:text-text rounded-full p-1 transition-colors">
             <X size={20} />
           </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const AiContentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: { topic: string; contentType: string; tone: string; length: string }) => void;
  isGenerating: boolean;
}> = ({ isOpen, onClose, onGenerate, isGenerating }) => {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState('Object History');
  const [tone, setTone] = useState('Informative');
  const [length, setLength] = useState('medium');

  const handleGenerateClick = () => {
    if (topic.trim()) {
      onGenerate({ topic, contentType, tone, length });
    } else {
      alert('Please enter a topic.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Content Assistant">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Describe what you want to write about, and the AI will generate a draft for you.
        </p>
        <Input
          label="Topic or Keywords"
          placeholder="e.g., 'The formation of the Pillars of Creation'"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Content Type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            <option>Object History</option>
            <option>Technical Tutorial</option>
            <option>Image Analysis</option>
            <option>Blog Post Section</option>
          </Select>
          <Select
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            <option>Informative</option>
            <option>Engaging</option>
            <option>Technical</option>
            <option>Beginner-Friendly</option>
          </Select>
          <Select
            label="Length"
            value={length}
            onChange={(e) => setLength(e.target.value)}
          >
            <option value="short">Short Paragraph</option>
            <option value="medium">Medium Section</option>
            <option value="long">Detailed Explanation</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button onClick={handleGenerateClick} isLoading={isGenerating}>
            <Sparkles size={16} /> Generate Content
          </Button>
        </div>
      </div>
    </Modal>
  );
};


export const Lightbox: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  items: { url: string; alt: string }[];
  startIndex?: number;
}> = ({ isOpen, onClose, items = [], startIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [isOpen, startIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (items.length > 1) {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, items.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <button
        aria-label="Close image viewer"
        className="fixed top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors z-50"
        onClick={onClose}
      >
        <X size={24} />
      </button>

      {items.length > 1 && (
        <>
          <button
            aria-label="Previous image"
            className="fixed left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 rounded-full p-3 hover:bg-black/75 transition-colors z-50"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            aria-label="Next image"
            className="fixed right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 rounded-full p-3 hover:bg-black/75 transition-colors z-50"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12 pb-24">
         <img
            key={currentItem.url}
            src={currentItem.url}
            alt={currentItem.alt || 'Enlarged view'}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm cursor-zoom-out select-none"
            onClick={(e) => {
                e.stopPropagation(); // Prevent double firing if bubbling
                onClose();
            }}
          />
      </div>

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-white bg-black/60 backdrop-blur-md p-4 rounded-xl w-[90%] max-w-2xl flex flex-col md:flex-row items-center justify-between gap-4 z-40 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="text-left">
            <p className="text-base font-medium text-white">{currentItem.alt}</p>
            {items.length > 1 && (
              <p className="text-xs text-white/60 mt-1">{currentIndex + 1} / {items.length}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-white/60 uppercase tracking-wider">Share</span>
            <SocialShare url={currentItem.url.startsWith('http') ? currentItem.url : `${window.location.origin}${currentItem.url}`} title={currentItem.alt} image={currentItem.url.startsWith('http') ? currentItem.url : `${window.location.origin}${currentItem.url}`} className="text-white" />
          </div>
      </div>
    </div>
  );
};

export const ToggleSwitch: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}> = ({ label, checked, onChange, className = '' }) => (
  <label className={`flex items-center justify-between cursor-pointer ${className}`}>
    <span className="text-sm font-medium text-text-secondary">{label}</span>
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}></div>
      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}></div>
    </div>
  </label>
);

export const ScrollToTopButton: React.FC<{
  isVisible: boolean;
  onClick: () => void;
}> = ({ isVisible, onClick }) => (
  <button
    onClick={onClick}
    aria-label="Scroll to top"
    className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all duration-300 ease-in-out
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'}`}
  >
    <ArrowUp size={24} />
  </button>
);

export const SocialShare: React.FC<{
  url: string;
  title: string;
  image?: string;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}> = ({ url, title, image, layout = 'horizontal', className = '' }) => {
  const [copyFeedback, setCopyFeedback] = React.useState('');
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: 'Twitter',
      icon: <Twitter size={18} />,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-[#1DA1F2] hover:text-white'
    },
    {
      name: 'Facebook',
      icon: <Facebook size={18} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-[#4267B2] hover:text-white'
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = image || url;
    link.download = title ? `${title.replace(/[^a-zA-Z0-9]/g, '_')}.webp` : 'astrocapture_image.webp';
    link.target = '_blank';
    link.click();
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* cancelled */ }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} gap-2 ${className}`}>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2 rounded-full bg-surface border border-border text-text-secondary transition-all duration-200 ${link.color}`}
          title={`Share on ${link.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {link.icon}
        </a>
      ))}
      {image && (
        <button
          onClick={(e) => { e.stopPropagation(); downloadImage(); }}
          className="p-2 rounded-full bg-surface border border-border text-text-secondary hover:bg-primary hover:text-white transition-all duration-200"
          title="Download image"
        >
          <Download size={18} />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); nativeShare(); }}
        className="p-2 rounded-full bg-surface border border-border text-text-secondary hover:bg-primary hover:text-white transition-all duration-200"
        title="Share"
      >
        <Share2 size={18} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
        className="p-2 rounded-full bg-surface border border-border text-text-secondary hover:bg-primary hover:text-white transition-all duration-200 relative"
        title="Copy link"
      >
        {copyFeedback ? <span className="text-xs font-bold text-primary">✓</span> : <LinkIcon size={18} />}
      </button>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);

export const CookieBanner: React.FC<{ config: { enabled: boolean; title: string; message: string; acceptButtonText: string; declineButtonText: string; }; onAccept: () => void; onDecline: () => void; }> = ({ config, onAccept, onDecline }) => {
  if (!config.enabled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 shadow-2xl z-50 animate-slide-up">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Cookie size={32} className="text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-lg">{config.title}</h3>
            <p className="text-text-secondary text-sm">{config.message}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={onDecline}>{config.declineButtonText}</Button>
          <Button onClick={onAccept}>{config.acceptButtonText}</Button>
        </div>
      </div>
    </div>
  );
};
