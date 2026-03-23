export type CertificationTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface VerificationBadgeProps {
  tier: CertificationTier;
  showLabel?: boolean;
}

const tierConfig = {
  bronze: {
    label: 'Bronze',
    className: 'badge-bronze',
    icon: '🥉',
  },
  silver: {
    label: 'Silver',
    className: 'badge-silver',
    icon: '🥈',
  },
  gold: {
    label: 'Gold',
    className: 'badge-gold',
    icon: '🥇',
  },
  platinum: {
    label: 'Platinum',
    className: 'badge-platinum',
    icon: '💎',
  },
};

export function VerificationBadge({ tier, showLabel = true }: VerificationBadgeProps) {
  const config = tierConfig[tier];

  return (
    <span className={config.className}>
      <span className="mr-1">{config.icon}</span>
      {showLabel && config.label}
    </span>
  );
}

interface VerificationStatusProps {
  isVerified: boolean;
  certificationCount?: number;
  highestTier?: CertificationTier;
}

export function VerificationStatus({
  isVerified,
  certificationCount = 0,
  highestTier,
}: VerificationStatusProps) {
  if (!isVerified) {
    return (
      <div className="flex items-center space-x-2 text-yellow-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Pending Verification</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-green-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Verified Product</span>
      </div>

      <div className="flex items-center space-x-3">
        {highestTier && <VerificationBadge tier={highestTier} />}
        <span className="text-sm text-gray-500">
          {certificationCount} certification{certificationCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
