/**
 * Ícones desenhados à mão em SVG (traço arredondado de 1,8 px), no lugar de emojis e
 * caracteres Unicode, para ficarem iguais em qualquer sistema operacional.
 */
const PATHS = {
  first: 'M6 5v14M18 6l-8 6 8 6z',
  prev: 'M16 6l-8 6 8 6z',
  next: 'M8 6l8 6-8 6z',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8.5 5.5v13M15.5 5.5v13',
  restart: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4',
  compare: 'M12 4v16M5 8l-2.5 6h5zM19 8l-2.5 6h5zM5 8h14M8 20h8',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  run: 'M5 12h12M12 6l6 6-6 6',
  back: 'M19 12H7M12 6l-6 6 6 6',
  info: 'M12 11v6M12 7.5v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
} as const;

export type IconName = keyof typeof PATHS;

/** Ícone em linha; herda a cor do texto. */
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const filled = name === 'play' || name === 'prev' || name === 'next' || name === 'first';
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Marca do simulador: um prato de disco visto de cima, dividido em setores (blocos). */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="logo">
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="var(--bg)" strokeWidth="2.2" />
      <circle cx="20" cy="20" r="7.5" fill="none" stroke="var(--bg)" strokeWidth="2.2" />
      <path d="M20 7a13 13 0 0 1 11.3 6.5L26.5 16.2A7.5 7.5 0 0 0 20 12.5z" fill="var(--bg)" />
      <path
        d="M33 20a13 13 0 0 1-3.4 8.8l-4-3.3a7.5 7.5 0 0 0 1.9-5.5z"
        fill="var(--accent-2)"
        stroke="var(--bg)"
        strokeWidth="1.2"
      />
      <circle cx="20" cy="20" r="2.2" fill="var(--bg)" />
    </svg>
  );
}
