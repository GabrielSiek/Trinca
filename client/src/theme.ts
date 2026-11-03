import { createGlobalStyle, css } from 'styled-components';

export const c = {
  bg: '#101210',
  well: '#0E100E',
  surface: '#181B18',
  tile: '#1E221C',
  field: '#21251F',
  line: '#2C312B',
  lineSoft: '#262A24',
  lineStrong: '#3A4037',
  dash: '#59614F',
  check: '#6B7461',
  text: '#EDF0E8',
  muted: '#A2A99D',
  faint: '#858D81',
  lime: '#C6EF4E',
  limeHover: '#E2FA9A',
  onLime: '#14170F',
  limeTint: '#232B14',
  limeDeep: '#1C2414',
  limeEdge: '#3A4A1C',
  limeRing: '#4A5E22',
  limeRow: '#1F2614',
  barBg: '#1A1F15',
  orange: '#FF9248',
  onOrange: '#1A1208',
  future: '#141713',
  dot: '#8E9A6A',
  nav: '#141714',
} as const;

export const MOBILE_WIDTH = 720;
export const mobile = `@media (max-width: ${MOBILE_WIDTH}px)`;

export const mono = css`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
`;

export const hatch = (size: number) => `repeating-linear-gradient(135deg, #2A2F27 0 ${size}px, #1C201A ${size}px ${size * 2}px)`;

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  html:has(dialog[open]) { overflow: hidden; }
  body {
    margin: 0;
    background: ${c.bg};
    color: ${c.text};
    font-family: 'Archivo Variable', 'Arial Narrow', system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }
  a { color: ${c.lime}; }
  a:hover { color: ${c.limeHover}; }
  button, input, textarea { font: inherit; color: inherit; }
  button { -webkit-tap-highlight-color: transparent; }
  button:disabled { cursor: not-allowed; opacity: 0.45; }
  input:focus, textarea:focus { outline: none; }
  :focus-visible { outline: 2px solid ${c.lime}; outline-offset: 2px; }
  input:focus-visible, textarea:focus-visible { outline-offset: 0; }
  h1, h2, h3, p { margin: 0; }
`;
