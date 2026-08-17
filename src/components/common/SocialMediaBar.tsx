import { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { SocialMediaLink } from '@/types';
import { Facebook, Instagram, Youtube, Twitter, Globe, MessageCircle, Share2 } from 'lucide-react';

interface SocialMediaBarProps {
  className?: string;
  iconSize?: number;
  showLabels?: boolean;
}

export const SocialMediaBar = ({ className = '', iconSize = 20, showLabels = false }: SocialMediaBarProps) => {
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await api.getSocialMediaLinks();
      // Filter visible links (though API might already do it for public, safety first)
      setLinks(data.filter(l => l.is_visible));
      setLoading(false);
    };
    fetchLinks();
  }, []);

  if (loading || links.length === 0) return null;

  const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('facebook')) return <Facebook size={iconSize} />;
    if (p.includes('instagram')) return <Instagram size={iconSize} />;
    if (p.includes('youtube')) return <Youtube size={iconSize} />;
    if (p.includes('twitter') || p.includes('x')) return <Twitter size={iconSize} />;
    if (p.includes('whatsapp')) return <MessageCircle size={iconSize} />;
    if (p.includes('website')) return <Globe size={iconSize} />;
    return <Share2 size={iconSize} />;
  };

  const getPlatformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('facebook')) return 'hover:text-blue-600 hover:bg-blue-50';
    if (p.includes('instagram')) return 'hover:text-pink-600 hover:bg-pink-50';
    if (p.includes('youtube')) return 'hover:text-red-600 hover:bg-red-50';
    if (p.includes('twitter') || p.includes('x')) return 'hover:text-gray-900 hover:bg-gray-100';
    if (p.includes('whatsapp')) return 'hover:text-green-600 hover:bg-green-50';
    if (p.includes('website')) return 'hover:text-blue-500 hover:bg-blue-50';
    return 'hover:text-primary hover:bg-primary/10';
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 p-2 rounded-full transition-all duration-300 border bg-background shadow-sm ${getPlatformColor(link.platform)}`}
          title={link.platform}
        >
          {getSocialIcon(link.platform)}
          {showLabels && <span className="text-sm font-medium pr-1">{link.platform}</span>}
        </a>
      ))}
    </div>
  );
};
