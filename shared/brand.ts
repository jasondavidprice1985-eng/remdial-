/**
 * Single source of truth for company + product branding.
 * Edit this file to change names, colours, and copy across both apps.
 */
export const brand = {
  company: 'System22',
  companyShort: 'S22',
  legalName: 'System22 Ltd',
  tagline: 'Enterprise Operations Platform',
  supportEmail: 'support@system22.xyz',
  website: 'https://system22.xyz',

  colors: {
    navy: '#0b1220',
    navyLight: '#151d2e',
    accent: '#1e40af',
    accentHover: '#1e3a8a',
    gold: '#c5a572',
    goldMuted: '#a68b5b',
  },

  products: {
    field: {
      name: 'Field',
      fullName: 'System22 Field',
      subtitle: 'Mobile Operations',
      description: 'Capture remedial reports from site with offline support.',
      pwaShortName: 'S22 Field',
    },
    control: {
      name: 'Control',
      fullName: 'System22 Control',
      subtitle: 'Operations Centre',
      description: 'Manage, triage, and fulfil remedial workflows in real time.',
    },
  },

  copy: {
    newReport: 'New Report',
    reports: 'Reports',
    worksOrder: 'Remedial Works Order',
    secureSignIn: 'Secure sign-in',
    enterpriseGrade: 'Enterprise-grade workflow management',
  },
} as const;

export type BrandProduct = keyof typeof brand.products;
