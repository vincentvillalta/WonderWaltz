import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'wand'
  | 'compass'
  | 'map'
  | 'clock'
  | 'cloud'
  | 'heart'
  | 'accessibility'
  | 'luggage'
  | 'sparkle'
  | 'check'
  | 'arrow'
  | 'apple'
  | 'play'
  | 'menu'
  | 'x'
  | 'plus'
  | 'minus'
  | 'ribbon'
  | 'leaf';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/**
 * Monoline icon set — inline SVG so we never pay a font or icon-lib load.
 * Matches the 1.6px-stroke WonderWaltz house style from the design handoff.
 */
export function Icon({
  name,
  size = 22,
  strokeWidth = 1.6,
  color = 'currentColor',
  ...rest
}: IconProps) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...rest,
  };
  return <svg {...common}>{ICON_PATHS[name]}</svg>;
}

const ICON_PATHS: Record<IconName, ReactElement> = {
  wand: (
    <>
      <path d="M4 20L14 10" />
      <path d="M17 4l.8 2.2L20 7l-2.2.8L17 10l-.8-2.2L14 7l2.2-.8L17 4z" />
      <circle cx="13" cy="11" r="1" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5L13 13l-4.5 2.5L11 11l4.5-2.5z" />
    </>
  ),
  map: (
    <>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v16M15 6v16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cloud: <path d="M7 18h10a4 4 0 100-8 6 6 0 00-11.7 1A3.5 3.5 0 007 18z" />,
  heart: <path d="M12 20s-7-4.35-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.65-7 10-7 10z" />,
  accessibility: (
    <>
      <circle cx="12" cy="5" r="1.3" />
      <path d="M8 9h8M12 9v4M8 20l4-7 4 7M10 13h4" />
    </>
  ),
  luggage: (
    <>
      <rect x="6" y="7" width="12" height="13" rx="2" />
      <path d="M10 7V4h4v3M6 12h12M10 20v1M14 20v1" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.8 4.8L18 9l-4.2 1.2L12 15l-1.8-4.8L6 9l4.2-1.2z" />
      <path d="M19 15l.8 1.7L21 18l-1.2.8L19 21l-.8-2.2L17 18l1.2-.5z" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  apple: (
    <>
      <path d="M16 4c-.9 1-2.2 1.6-3 1.6-.1-1 .4-2 1-2.6.7-.7 1.9-1.3 2.6-1.3.1 1-.3 2-1 2.6z" />
      <path d="M18 9c-1-.8-2.2-1-3-1-1.5 0-2.6.7-3.3.7-.8 0-2-.7-3.3-.7-2.2 0-4.4 1.6-4.4 4.8C4 15.7 6 20 8.3 20c1 0 1.8-.6 2.7-.6.9 0 1.6.6 2.7.6 1.7 0 3.3-2.7 3.9-4.7-2.7-1.2-2.7-4.6.4-6.3z" />
    </>
  ),
  play: <path d="M7 4l13 8-13 8z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  ribbon: <path d="M5 5s5 2 7 7 7 7 7 7-5-2-7-7-7-7-7-7z" />,
  leaf: <path d="M5 19c5-1 11-6 14-14-8 3-13 9-14 14z" />,
};
