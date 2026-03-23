import { VerificationBadge, CertificationTier } from './VerificationBadge';

interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  artisan: string;
  imageUri?: string;
  status: 'pending' | 'verified' | 'disputed' | 'rejected';
  certificationTier?: CertificationTier;
  onClick?: () => void;
}

export function ProductCard({
  id,
  name,
  category,
  artisan,
  imageUri,
  status,
  certificationTier,
  onClick,
}: ProductCardProps) {
  return (
    <div
      className="card hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
        {imageUri ? (
          <img
            src={imageUri}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{name}</h3>
          {certificationTier && <VerificationBadge tier={certificationTier} />}
        </div>

        <p className="text-sm text-gray-500">{category}</p>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-600">
            by <span className="font-medium">{artisan}</span>
          </span>

          <span className={`text-xs px-2 py-1 rounded-full ${
            status === 'verified' ? 'bg-green-100 text-green-700' :
            status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            status === 'disputed' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <div className="text-xs text-gray-400">
          Product ID: #{id}
        </div>
      </div>
    </div>
  );
}
