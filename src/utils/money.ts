/** $1,234.50 (es-MX); sin decimales si son .00. */
export const money = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
