export type AccountRole = 'user' | 'admin';
export type AccountPlan = 'normal' | 'premium';
export interface AccountAccess {
  status: 'active' | 'inactive';
  role: AccountRole;
  plan: AccountPlan;
  premiumExpiresAt: string | null;
}
export const normalAccess: AccountAccess = { status: 'active', role: 'user', plan: 'normal', premiumExpiresAt: null };

export function accountCapabilities(access: AccountAccess, now = Date.now()) {
  const premium = access.status === 'active' && access.plan === 'premium' && (access.premiumExpiresAt === null || Date.parse(access.premiumExpiresAt) > now);
  return { isAdmin: access.status === 'active' && access.role === 'admin', isPremium: premium, canChooseCheckInDate: premium, canUsePhotoTemplates: premium };
}
