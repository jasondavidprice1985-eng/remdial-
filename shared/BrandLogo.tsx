import { brand } from './brand';

interface BrandLogoProps {
  /** field = mobile app, control = office dashboard */
  product?: 'field' | 'control';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showProduct?: boolean;
}

const sizes = {
  sm: { mark: 'w-8 h-8', markText: 'text-xs', company: 'text-sm', product: 'text-[10px]' },
  md: { mark: 'w-10 h-10', markText: 'text-sm', company: 'text-base', product: 'text-xs' },
  lg: { mark: 'w-12 h-12', markText: 'text-base', company: 'text-xl', product: 'text-sm' },
} as const;

export function BrandLogo({
  product,
  size = 'md',
  variant = 'dark',
  showProduct = true,
}: BrandLogoProps) {
  const s = sizes[size];
  const isLight = variant === 'light';
  const productInfo = product ? brand.products[product] : null;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`${s.mark} rounded-xl shrink-0 flex items-center justify-center font-bold tracking-tight ${s.markText}`}
        style={{
          background: isLight
            ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)'
            : `linear-gradient(135deg, ${brand.colors.navy} 0%, ${brand.colors.navyLight} 100%)`,
          color: isLight ? '#ffffff' : brand.colors.gold,
          border: isLight ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${brand.colors.goldMuted}33`,
          boxShadow: isLight ? 'none' : '0 1px 2px rgba(11, 18, 32, 0.12)',
        }}
        aria-hidden
      >
        {brand.companyShort}
      </div>
      <div className="min-w-0">
        <p
          className={`${s.company} font-bold tracking-tight leading-tight truncate`}
          style={{ color: isLight ? '#ffffff' : 'var(--text)' }}
        >
          {brand.company}
          {productInfo && showProduct && (
            <span style={{ color: isLight ? brand.colors.gold : brand.colors.accent }}>
              {' '}{productInfo.name}
            </span>
          )}
        </p>
        {productInfo && showProduct && (
          <p
            className={`${s.product} uppercase tracking-[0.18em] font-semibold truncate`}
            style={{ color: isLight ? 'rgba(255,255,255,0.72)' : 'var(--muted)' }}
          >
            {productInfo.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
