import { ReactNode } from 'react';
import { brand, BrandProduct } from './brand';
import { BrandLogo } from './BrandLogo';

interface EnterpriseLoginLayoutProps {
  product: BrandProduct;
  children: ReactNode;
}

const highlights = [
  'Real-time field-to-office sync',
  'Secure role-based access',
  'Audit-ready workflow tracking',
] as const;

export function EnterpriseLoginLayout({ product, children }: EnterpriseLoginLayoutProps) {
  const info = brand.products[product];

  return (
    <div className="app-enterprise min-h-screen flex">
      {/* Brand panel — hidden on small screens, full enterprise split on desktop */}
      <aside
        className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${brand.colors.navy} 0%, ${brand.colors.navyLight} 55%, #1a2744 100%)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 0% 0%, rgba(30, 64, 175, 0.35), transparent 60%),' +
              'radial-gradient(ellipse 50% 40% at 100% 100%, rgba(197, 165, 114, 0.15), transparent 55%)',
          }}
        />

        <div className="relative z-10">
          <BrandLogo product={product} size="lg" variant="light" />
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-3">
              {brand.tagline}
            </p>
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-[1.15]">
              {info.fullName}
            </h2>
            <p className="mt-4 text-base text-white/70 leading-relaxed">
              {info.description}
            </p>
          </div>

          <ul className="space-y-3">
            {highlights.map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                  style={{ background: `${brand.colors.gold}33`, color: brand.colors.gold }}
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {brand.legalName}
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col min-h-screen enterprise-bg">
        <div
          className="lg:hidden px-5 py-5 border-b"
          style={{
            background: brand.colors.navy,
            borderColor: 'rgba(255,255,255,0.08)',
            paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          }}
        >
          <BrandLogo product={product} size="md" variant="light" />
        </div>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-[420px] animate-slide-up">
            <div className="enterprise-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] mb-2">
                  {brand.copy.secureSignIn}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
                  Sign in to {info.name}
                </h1>
                <p className="text-sm text-[var(--muted)] mt-1.5">
                  {info.subtitle} · {brand.copy.enterpriseGrade}
                </p>
              </div>
              {children}
            </div>

            <p className="text-center text-xs text-[var(--muted)] mt-6">
              {brand.legalName} · {brand.supportEmail}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
