'use client';
/**
 * Avatar de pessoa — o mesmo em listas, cadastros e no cabeçalho: foto de perfil quando houver,
 * senão as iniciais sobre um tom suave da paleta institucional (estável por pessoa).
 */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiAsset, initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const TONES = [
  'bg-blue-100 text-[#0D3969]',
  'bg-sky-100 text-sky-900',
  'bg-emerald-100 text-emerald-900',
  'bg-violet-100 text-violet-900',
  'bg-teal-100 text-teal-900',
  'bg-slate-200 text-slate-800',
];
const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-11 w-11 text-sm', xl: 'h-24 w-24 text-2xl' };

const toneOf = (key = '') => TONES[[...String(key)].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7) % TONES.length];

/** `src` sobrepõe a foto do usuário (pré-visualização de um recorte ainda não salvo). */
export function UserAvatar({ user, src, size = 'md', className, fallbackClassName, ring = false }) {
  const photo = src || apiAsset(user?.avatar);
  return (
    <Avatar className={cn('shrink-0', SIZES[size], ring && 'ring-2 ring-white', className)}>
      {photo && <AvatarImage src={photo} alt="" className="object-cover" />}
      <AvatarFallback className={cn('font-semibold', toneOf(user?.id || user?.email || user?.name), fallbackClassName)} aria-hidden={!!photo}>
        {initials(user?.name || '?')}
      </AvatarFallback>
    </Avatar>
  );
}
