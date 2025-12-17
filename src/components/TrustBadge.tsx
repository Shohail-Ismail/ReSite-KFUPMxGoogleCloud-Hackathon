import { Star, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface TrustBadgeProps {
  user?: User | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function TrustBadge({ user, size = 'md', showDetails = false, className }: TrustBadgeProps) {
  if (!user) {
    return (
      <div className={cn('flex items-center gap-1.5 text-muted-foreground', className)}>
        <span className={cn('text-xs', size === 'lg' && 'text-sm')}>New Member</span>
      </div>
    );
  }

  const trustScore = user.trustScore || 0;
  const totalRatings = user.totalRatings || 0;
  const verified = user.verifiedSeller || user.verifiedBuyer;
  const responseRate = user.responseRate;

  let trustLevel = 'New';
  let trustColorClass = 'text-muted-foreground bg-muted/50';

  if (totalRatings >= 10 && trustScore >= 4.5) {
    trustLevel = 'Excellent';
    trustColorClass = 'text-green-700 dark:text-green-400 bg-green-500/10';
  } else if (totalRatings >= 5 && trustScore >= 4) {
    trustLevel = 'Trusted';
    trustColorClass = 'text-blue-700 dark:text-blue-400 bg-blue-500/10';
  } else if (totalRatings >= 2 && trustScore >= 3) {
    trustLevel = 'Verified';
    trustColorClass = 'text-violet-700 dark:text-violet-400 bg-violet-500/10';
  } else if (totalRatings > 0) {
    trustLevel = 'Active';
    trustColorClass = 'text-amber-700 dark:text-amber-400 bg-amber-500/10';
  }

  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';
  const badgePadding = size === 'sm' ? 'px-1.5 py-0.5' : size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-1';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Verified badge */}
      {verified && (
        <div className={cn(
          'flex items-center gap-1 rounded-full',
          badgePadding,
          'bg-green-500/10 text-green-700 dark:text-green-400'
        )}>
          <Shield className={iconSize} />
          <span className={cn(textSize, 'font-medium')}>Verified</span>
        </div>
      )}

      {/* Trust score badge */}
      <div className={cn(
        'flex items-center gap-1 rounded-full',
        badgePadding,
        trustColorClass
      )}>
        {totalRatings > 0 ? (
          <>
            <Star className={cn(iconSize, 'fill-current')} />
            <span className={cn(textSize, 'font-semibold')}>{trustScore.toFixed(1)}</span>
            <span className={cn(textSize, 'opacity-70')}>({totalRatings})</span>
          </>
        ) : (
          <span className={cn(textSize, 'font-medium')}>{trustLevel}</span>
        )}
      </div>

      {/* Response rate badge */}
      {showDetails && responseRate !== undefined && responseRate > 0 && (
        <div className={cn(
          'flex items-center gap-1 rounded-full',
          badgePadding,
          'bg-muted text-muted-foreground'
        )}>
          <Zap className={iconSize} />
          <span className={cn(textSize)}>{responseRate}% response</span>
        </div>
      )}
    </div>
  );
}

interface UserProfileBadgeProps {
  user?: User | null;
  organizationName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserProfileBadge({ user, organizationName, size = 'md', className }: UserProfileBadgeProps) {
  const avatarSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const nameSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm';
  const orgSize = size === 'sm' ? 'text-xs' : 'text-xs';
  
  const displayName = user?.displayName || 'Unknown User';
  const initial = displayName[0]?.toUpperCase() || 'U';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn(
        avatarSize,
        'rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center'
      )}>
        <span className={cn(
          'font-semibold text-muted-foreground',
          size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
        )}>
          {initial}
        </span>
      </div>
      <div className="flex flex-col">
        <span className={cn(nameSize, 'font-medium text-foreground')}>{displayName}</span>
        {organizationName && (
          <span className={cn(orgSize, 'text-muted-foreground')}>{organizationName}</span>
        )}
      </div>
    </div>
  );
}
