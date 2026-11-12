import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Instagram, Loader2 } from 'lucide-react';
import { linkInBioService } from '@/services';
import { cn } from '@/lib/utils';

interface PublicLink {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  thumbnailUrl?: string;
}

interface PublicPage {
  slug: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  theme: {
    template: 'minimal' | 'gradient' | 'cards' | 'glass' | 'sunset';
    backgroundColor: string;
    backgroundImageUrl?: string;
    accentColor: string;
    textColor: string;
    buttonStyle: 'solid' | 'outline' | 'soft' | 'pill';
    showInstagramProfile: boolean;
    fontFamily: string;
  };
  links: PublicLink[];
  socialLinks: Array<{ platform: string; url: string }>;
}

const templates: Record<string, string> = {
  minimal: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #d946ef 100%)',
  cards: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
  glass: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 55%, #4c1d95 100%)',
  sunset: 'linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #a855f7 100%)',
};

const buttonStyles: Record<string, string> = {
  solid: 'text-white shadow-lg',
  outline: 'border-2 bg-transparent',
  soft: 'bg-white/15 backdrop-blur',
  pill: 'rounded-full text-white shadow-lg',
};

export default function PublicLinkInBio() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visitorId = useMemo(() => {
    const storageKey = 'instaflow.visitorId';
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing) return existing;
      const generated = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(storageKey, generated);
      return generated;
    } catch {
      return `v_${Date.now()}`;
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    linkInBioService
      .publicPage(slug)
      .then((response) => {
        if (cancelled) return;
        const data = response.data.page as unknown as PublicPage;
        setPage(data);
        document.title = `${data.title} — Instaflow`;
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleClick = async (linkId: string, url: string) => {
    try {
      await fetch(`/api/p/${slug}/click/${linkId}`, {
        method: 'POST',
        headers: { 'x-visitor-id': visitorId, 'Content-Type': 'application/json' },
      });
    } catch {
      /* tracking must never block navigation */
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? 'This link-in-bio page does not exist or is not published.'}
          </p>
        </div>
      </div>
    );
  }

  const { theme } = page;

  const backgroundStyle: React.CSSProperties = theme.backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${theme.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage: templates[theme.template] ?? templates.gradient,
        backgroundColor: theme.backgroundColor,
      };

  return (
    <div className="relative flex min-h-screen flex-col items-center px-5 py-14" style={backgroundStyle}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center">
          {theme.showInstagramProfile && page.avatarUrl && (
            <img
              src={page.avatarUrl}
              alt={page.title}
              className="h-24 w-24 rounded-full border-4 border-white/25 object-cover shadow-2xl"
            />
          )}

          <h1
            className="mt-5 text-2xl font-bold tracking-tight"
            style={{ color: theme.textColor }}
          >
            {page.title}
          </h1>

          {page.bio && (
            <p
              className="mt-2.5 max-w-sm text-sm leading-relaxed opacity-85"
              style={{ color: theme.textColor }}
            >
              {page.bio}
            </p>
          )}

          {page.socialLinks?.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {page.socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-transform hover:scale-110"
                  aria-label={social.platform}
                >
                  {social.platform.toLowerCase() === 'instagram' ? (
                    <Instagram className="h-4 w-4" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mt-9 space-y-3">
          {page.links
            .filter((link) => link.isActive)
            .map((link, index) => (
              <motion.button
                key={link.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 * index }}
                onClick={() => void handleClick(link.id, link.url)}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl',
                  buttonStyles[theme.buttonStyle],
                  theme.buttonStyle === 'solid' && 'bg-gradient-to-r from-indigo-500 to-purple-600',
                  theme.buttonStyle === 'outline' && 'border-white/40 text-white hover:bg-white/10',
                  theme.buttonStyle === 'pill' && 'bg-gradient-to-r from-indigo-500 to-purple-600',
                )}
                style={
                  theme.buttonStyle === 'solid' || theme.buttonStyle === 'pill'
                    ? undefined
                    : { color: theme.textColor }
                }
              >
                <span className="flex items-center gap-2.5">
                  {link.thumbnailUrl && (
                    <img
                      src={link.thumbnailUrl}
                      alt=""
                      className="h-7 w-7 rounded-md object-cover"
                    />
                  )}
                  {link.title}
                </span>
                <ExternalLink className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
              </motion.button>
            ))}
        </div>

        <p className="mt-10 text-center text-xs opacity-60" style={{ color: theme.textColor }}>
          Powered by Instaflow
        </p>
      </motion.div>
    </div>
  );
}
