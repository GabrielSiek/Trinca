import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { CheckIcon } from './icons.tsx';
import { c, mobile, mono } from '../theme.ts';

export const Mono = styled.span<{ $size?: number; $color?: string; $mobileSize?: number }>`
  ${mono}
  font-size: ${(p) => p.$size ?? 12}px;
  color: ${(p) => p.$color ?? c.muted};
  ${mobile} {
    font-size: ${(p) => p.$mobileSize ?? p.$size ?? 12}px;
  }
`;

export const Eyebrow = styled(Mono)`
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const Muted = styled.span<{ $size?: number }>`
  font-size: ${(p) => p.$size ?? 13}px;
  color: ${c.muted};
  text-wrap: pretty;
`;

export const BigNumber = styled.span<{ $size: number; $mobile?: number; $color?: string; $stretch?: number }>`
  font-size: ${(p) => p.$size}px;
  font-weight: 800;
  font-stretch: ${(p) => p.$stretch ?? 62}%;
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
  color: ${(p) => p.$color ?? 'inherit'};
  ${mobile} {
    font-size: ${(p) => p.$mobile ?? p.$size}px;
  }
`;

export const Heading = styled.h2<{ $size?: number; $mobile?: number }>`
  font-size: ${(p) => p.$size ?? 28}px;
  font-weight: 800;
  font-stretch: 68%;
  text-transform: uppercase;
  line-height: 1.1;
  ${mobile} {
    font-size: ${(p) => p.$mobile ?? p.$size ?? 24}px;
  }
`;

export const PageTitle = styled.h1`
  font-size: 56px;
  font-weight: 800;
  font-stretch: 62%;
  line-height: 0.9;
  text-transform: uppercase;
  ${mobile} {
    font-size: 44px;
  }
`;

export const Card = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: ${c.surface};
  border: 1px solid ${c.line};
  border-radius: 18px;
  padding: 24px 28px;
  ${mobile} {
    padding: 16px;
    border-radius: 16px;
  }
`;

type Variant = 'primary' | 'outline' | 'neutral' | 'quiet' | 'light' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, ReturnType<typeof css>> = {
  primary: css`background: ${c.lime}; border-color: ${c.lime}; color: ${c.onLime}; font-weight: 700;`,
  outline: css`background: transparent; border-color: ${c.lime}; color: ${c.lime};`,
  neutral: css`background: ${c.field}; border-color: ${c.lineStrong}; color: ${c.text};`,
  quiet: css`background: transparent; border-color: ${c.lineStrong}; color: ${c.text};`,
  light: css`background: ${c.text}; border-color: ${c.text}; color: ${c.onLime}; font-weight: 700;`,
  ghost: css`background: transparent; border-color: transparent; color: ${c.lime}; padding: 0 12px;`,
  danger: css`background: ${c.orange}; border-color: ${c.orange}; color: ${c.onOrange}; font-weight: 700;`,
};

export const Button = styled.button.attrs((p) => ({ type: p.type ?? 'button' }))<{ $variant?: Variant; $block?: boolean; $height?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: ${(p) => p.$height ?? 44}px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  line-height: 1.2;
  width: ${(p) => (p.$block ? '100%' : 'auto')};
  ${(p) => VARIANTS[p.$variant ?? 'neutral']}
`;

export const IconButton = styled.button.attrs((p) => ({ type: p.type ?? 'button' }))<{ $bare?: boolean; $color?: string }>`
  flex: none;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 12px;
  cursor: pointer;
  background: ${(p) => (p.$bare ? 'transparent' : c.surface)};
  border: ${(p) => (p.$bare ? '0' : `1px solid ${c.line}`)};
  color: ${(p) => p.$color ?? c.text};
`;

export const FieldBox = styled.div<{ $height?: number; $radius?: number }>`
  display: flex;
  align-items: center;
  gap: 6px;
  height: ${(p) => p.$height ?? 44}px;
  padding: 0 12px;
  background: ${c.field};
  border: 1px solid ${c.lineStrong};
  border-radius: ${(p) => p.$radius ?? 12}px;
  &:focus-within {
    border-color: ${c.lime};
  }
`;

export const BareInput = styled.input<{ $align?: string; $mono?: boolean; $size?: number }>`
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  background: transparent;
  border: 0;
  color: ${c.text};
  text-align: ${(p) => p.$align ?? 'left'};
  font-size: ${(p) => p.$size ?? 16}px;
  ${(p) => p.$mono && mono}
  &::placeholder {
    color: ${c.faint};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  resize: vertical;
  padding: 14px 16px;
  background: ${c.field};
  border: 1px solid ${c.lineStrong};
  border-radius: 12px;
  color: ${c.text};
  font-size: 16px;
  line-height: 1.5;
  &:focus {
    border-color: ${c.lime};
  }
  &::placeholder {
    color: ${c.faint};
  }
`;

export const Label = styled.label`
  font-weight: 600;
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;

export const Tag = styled.span<{ $tone?: 'orange' | 'lime' }>`
  flex: none;
  padding: 2px 8px;
  border-radius: 6px;
  ${mono}
  font-size: 11px;
  font-weight: 500;
  background: ${(p) => (p.$tone === 'lime' ? c.lime : c.orange)};
  color: ${(p) => (p.$tone === 'lime' ? c.onLime : c.onOrange)};
`;

const CheckButton = styled.button.attrs({ type: 'button' })<{ $on: boolean; $size: number; $radius: number; $off: string }>`
  flex: none;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${(p) => p.$radius}px;
  cursor: pointer;
  color: ${c.onLime};
  background: ${(p) => (p.$on ? c.lime : 'transparent')};
  border: 2px solid ${(p) => (p.$on ? c.lime : p.$off)};
`;

interface CheckProps extends Omit<ComponentProps<'button'>, 'onChange'> {
  checked: boolean;
  label: string;
  offColor?: string;
}

export function Check({ checked, label, offColor = c.check, ...rest }: CheckProps) {
  return (
    <CheckButton $on={checked} $size={44} $radius={12} $off={offColor} aria-pressed={checked} aria-label={label} {...(rest as object)}>
      {checked && <CheckIcon size={22} />}
    </CheckButton>
  );
}

const Track = styled.span<{ $on: boolean }>`
  position: relative;
  display: block;
  width: 56px;
  height: 32px;
  border-radius: 999px;
  background: ${(p) => (p.$on ? c.lime : c.line)};
`;

const Knob = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 3px;
  left: ${(p) => (p.$on ? 27 : 3)}px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: ${(p) => (p.$on ? c.onLime : c.muted)};
  transition: left 0.12s ease;
`;

const ToggleButton = styled.button.attrs({ type: 'button' })`
  flex: none;
  width: 64px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  background: transparent;
  border: 0;
  cursor: pointer;
`;

export function Toggle({ on, labelledBy, onClick }: { on: boolean; labelledBy: string; onClick: () => void }) {
  return (
    <ToggleButton aria-labelledby={labelledBy} aria-pressed={on} onClick={onClick}>
      <Track $on={on}>
        <Knob $on={on} />
      </Track>
    </ToggleButton>
  );
}

const SegmentedBox = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: ${c.bg};
  border: 1px solid ${c.line};
  border-radius: 14px;
`;

const SegmentButton = styled.button.attrs({ type: 'button' })<{ $on: boolean }>`
  flex: 1 1 0;
  min-height: 44px;
  border-radius: 10px;
  border: 0;
  cursor: pointer;
  font-weight: 600;
  background: ${(p) => (p.$on ? c.text : 'transparent')};
  color: ${(p) => (p.$on ? c.onLime : c.text)};
  ${mobile} {
    font-size: 14px;
  }
`;

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <SegmentedBox role="group" aria-label={label}>
      {options.map((option) => (
        <SegmentButton key={option.id} $on={option.id === value} aria-pressed={option.id === value} onClick={() => onChange(option.id)}>
          {option.label}
        </SegmentButton>
      ))}
    </SegmentedBox>
  );
}

/** Text input that keeps its own draft and only reports on blur or Enter. */
export function CommitInput({ value, onCommit, filter, ...rest }: { value: string; onCommit: (value: string) => void; filter?: (value: string) => string } & Omit<ComponentProps<typeof BareInput>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <BareInput
      {...rest}
      value={draft}
      onChange={(e) => setDraft(filter ? filter(e.target.value) : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

export const CenteredState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 60vh;
  color: ${c.muted};
  text-align: center;
`;
