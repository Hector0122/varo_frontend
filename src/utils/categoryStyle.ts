/** Ícono (MaterialCommunityIcons) y color por nombre de categoría, sin tocar el backend. */
const STYLES: [RegExp, string, string][] = [
  [/comida|restaur|caf[eé]|antojo/i, 'silverware-fork-knife', '#F97316'],
  [/super|despensa|mandado/i, 'cart-outline', '#22C55E'],
  [/transporte|uber|taxi|metro|cami[oó]n/i, 'car-outline', '#3B82F6'],
  [/gasolina/i, 'gas-station-outline', '#EAB308'],
  [/suscrip|netflix|spotify|streaming/i, 'play-circle-outline', '#A855F7'],
  [/servicio|luz|agua|internet|tel[eé]fono|celular/i, 'flash-outline', '#06B6D4'],
  [/salud|farmacia|m[eé]dic|doctor/i, 'medical-bag', '#EF4444'],
  [/compras en l[ií]nea|amazon|mercado/i, 'package-variant-closed', '#F59E0B'],
  [/entreten|cine|juego|salida/i, 'movie-open-outline', '#EC4899'],
  [/ropa|zapato/i, 'tshirt-crew-outline', '#8B5CF6'],
  [/hogar|casa|renta/i, 'home-outline', '#14B8A6'],
  [/inter[eé]s|comisi/i, 'percent-outline', '#64748B'],
  [/sueldo|n[oó]mina|salario|ingreso/i, 'cash-plus', '#16A34A'],
  [/abono|pago/i, 'bank-transfer-in', '#16A34A'],
  [/ahorro|saving/i, 'piggy-bank-outline', '#16A34A'],
  [/deuda|debt/i, 'credit-card-outline', '#64748B'],
  [/educa|escuela|curso|libro/i, 'school-outline', '#0EA5E9'],
  [/mascota|perro|gato/i, 'paw', '#D97706'],
  [/regalo/i, 'gift-outline', '#DB2777'],
];

export function categoryStyle(name: string): { icon: string; color: string } {
  const hit = STYLES.find(([re]) => re.test(name));
  return hit ? { icon: hit[1], color: hit[2] } : { icon: 'tag-outline', color: '#94A3B8' };
}
