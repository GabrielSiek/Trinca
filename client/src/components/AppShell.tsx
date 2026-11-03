import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { useIsMobile } from '../hooks.ts';
import { todayISO } from '../lib/dates.ts';
import { cycleInfo } from '../lib/progress.ts';
import { usePlan } from '../PlanContext.tsx';
import { c, mobile, mono } from '../theme.ts';
import { ChartIcon, CheckIcon, DumbbellIcon } from './icons.tsx';

const Frame = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  flex: 1 1 auto;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 48px) 72px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  ${mobile} {
    gap: 16px;
    padding: 16px 16px 24px;
  }
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid ${c.line};
  ${mobile} {
    flex-wrap: nowrap;
    gap: 8px;
    padding-bottom: 0;
    border-bottom: 0;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: baseline;
  gap: 14px;
  ${mobile} {
    flex-direction: column;
    gap: 0;
    line-height: 1.1;
  }
`;

const BrandName = styled.span`
  font-size: 30px;
  font-weight: 800;
  font-stretch: 68%;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  ${mobile} {
    font-size: 24px;
    letter-spacing: 0;
  }
`;

const BrandDay = styled.span`
  ${mono}
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${c.muted};
  ${mobile} {
    font-size: 11px;
    letter-spacing: 0.06em;
  }
`;

const TopNav = styled.nav`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: ${c.surface};
  border: 1px solid ${c.line};
  border-radius: 999px;
`;

const TopLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 22px;
  border-radius: 999px;
  color: ${c.text};
  font-weight: 600;
  text-decoration: none;
  &:hover {
    color: ${c.lime};
  }
  &.active {
    background: ${c.lime};
    color: ${c.onLime};
  }
`;

const Dock = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
`;

const BottomNav = styled.nav`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 12px calc(20px + env(safe-area-inset-bottom));
  background: ${c.nav};
  border-top: 1px solid ${c.line};
`;

const BottomLink = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
  border-radius: 12px;
  color: ${c.text};
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  &.active {
    background: ${c.lime};
    color: ${c.onLime};
    font-weight: 700;
  }
`;

const SECTIONS = [
  { to: '/', label: 'Hoje', Icon: CheckIcon, iconWidth: 2 },
  { to: '/treino', label: 'Treino', Icon: DumbbellIcon, iconWidth: 2 },
  { to: '/progresso', label: 'Progresso', Icon: ChartIcon, iconWidth: 2 },
];

interface ShellProps {
  right?: ReactNode;
  /** Sticky content above the bottom nav (desktop: the bottom of the page). */
  dock?: ReactNode;
  children: ReactNode;
}

export function AppShell({ right, dock, children }: ShellProps) {
  const { plan } = usePlan();
  const isMobile = useIsMobile();
  const { dayNumber } = cycleInfo(plan.cycle, todayISO());

  return (
    <Frame>
      <Content>
        <Header>
          <Brand>
            <BrandName>Cutting</BrandName>
            <BrandDay>Dia {dayNumber} de {plan.cycle.days}</BrandDay>
          </Brand>
          {!isMobile && (
            <TopNav aria-label="Seções">
              {SECTIONS.map((s) => (
                <TopLink key={s.to} to={s.to} end={s.to === '/'}>{s.label}</TopLink>
              ))}
            </TopNav>
          )}
          {right}
        </Header>
        {children}
      </Content>
      {(dock || isMobile) && (
        <Dock>
          {dock}
          {isMobile && (
            <BottomNav aria-label="Seções">
              {SECTIONS.map(({ to, label, Icon, iconWidth }) => (
                <BottomLink key={to} to={to} end={to === '/'}>
                  <Icon size={20} width={iconWidth} />
                  {label}
                </BottomLink>
              ))}
            </BottomNav>
          )}
        </Dock>
      )}
    </Frame>
  );
}
