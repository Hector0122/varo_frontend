export const SYSTEM_CATEGORIES = {
  DEBT_PAYMENT: 'Debt Payment',
  SAVINGS: 'Savings',
} as const;

export function isLinkedCategory(category: string): boolean {
  return (
    category === SYSTEM_CATEGORIES.DEBT_PAYMENT ||
    category === SYSTEM_CATEGORIES.SAVINGS
  );
}
