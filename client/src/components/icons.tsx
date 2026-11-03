interface IconProps {
  size?: number;
  width?: number;
}

const icon = (path: string, defaultWidth = 2, filled = false) =>
  function Icon({ size = 18, width = defaultWidth }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    );
  };

export const CheckIcon = icon('M5 12.5l4.5 4.5L19 7.5', 3);
export const PlusIcon = icon('M12 5v14M5 12h14', 2.2);
export const MinusIcon = icon('M5 12h14', 2.4);
export const CloseIcon = icon('M6 6l12 12M18 6L6 18', 2.2);
export const SwapIcon = icon('M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7');
export const ChevronLeftIcon = icon('M15 6l-6 6 6 6');
export const ChevronRightIcon = icon('M9 6l6 6-6 6');
export const ChevronDownIcon = icon('M6 9l6 6 6-6');
export const TrashIcon = icon('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3');
export const DumbbellIcon = icon('M3 12h18M6 8v8M18 8v8M3.5 10v4M20.5 10v4');
export const ChartIcon = icon('M4 19h16M6 15l4-5 3 3 5-7');

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}
