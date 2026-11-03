import { useState } from 'react';
import styled from 'styled-components';
import type { ProgressDay } from '../../../../shared/types.ts';
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons.tsx';
import { Card, Heading, IconButton, Mono } from '../../components/ui.tsx';
import { monthGrid, monthName, parseISO, dateLong } from '../../lib/dates.ts';
import { c, mobile } from '../../theme.ts';

const Panel = styled(Card)`
  flex: 1 1 360px;
  gap: 14px;
  padding: 24px;
  ${mobile} {
    flex: none;
    gap: 12px;
    padding: 16px;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Nav = styled(IconButton)`
  background: ${c.field};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  ${mobile} {
    gap: 3px;
  }
`;

const Cell = styled.div<{ $state: 'empty' | 'past' | 'today' | 'future' }>`
  min-height: 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 7px 7px 8px;
  border-radius: 10px;
  background: ${(p) => (p.$state === 'past' || p.$state === 'today' ? c.field : 'transparent')};
  box-shadow: ${(p) => (p.$state === 'today' ? `inset 0 0 0 2px ${c.lime}` : p.$state === 'future' ? `inset 0 0 0 1px ${c.lineSoft}` : 'none')};
  ${mobile} {
    min-height: 50px;
    padding: 5px 5px 6px;
    border-radius: 8px;
  }
`;

const Marks = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  ${mobile} {
    gap: 2px;
  }
`;

const Mark = styled.span<{ $color: string; $width?: number }>`
  display: block;
  height: 4px;
  width: ${(p) => (p.$width ? `${p.$width}px` : 'auto')};
  border-radius: 999px;
  background: ${(p) => p.$color};
  ${mobile} {
    height: 3px;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding-top: 4px;
  font-size: 13px;
  color: ${c.muted};
  ${mobile} {
    gap: 8px 16px;
    padding-top: 0;
    font-size: 12px;
  }
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const ACTIVITY_NAME: Record<string, string> = { basquete: 'basquete', futebol: 'futebol', outra: 'atividade' };

export function MonthCalendar({ days, today }: { days: ProgressDay[]; today: string }) {
  const start = parseISO(today);
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const byDate = new Map(days.map((d) => [d.date, d]));

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Panel aria-labelledby="calendario-titulo">
      <Head>
        <Heading id="calendario-titulo">{monthName(view.month)}</Heading>
        <div style={{ display: 'flex', gap: 6 }}>
          <Nav aria-label="Mês anterior" onClick={() => shift(-1)}><ChevronLeftIcon /></Nav>
          <Nav aria-label="Próximo mês" onClick={() => shift(1)}><ChevronRightIcon /></Nav>
        </div>
      </Head>
      <Grid>
        {WEEK.map((letter, i) => (
          <Mono key={i} $size={11} $mobileSize={10} style={{ textAlign: 'center', padding: '4px 0' }}>{letter}</Mono>
        ))}
        {monthGrid(view.year, view.month).map((cell, i) => {
          if (!cell) return <Cell key={i} $state="empty" />;
          const day = byDate.get(cell.iso);
          const future = cell.iso > today;
          const game = !!day && day.activity !== 'nenhuma';
          const parts = [day?.musc ? 'musculação' : '', game ? ACTIVITY_NAME[day.activity] : ''].filter(Boolean);
          const label = `${dateLong(cell.iso)}${parts.length ? `: ${parts.join(' e ')}` : future ? '' : ': descanso'}`;
          return (
            <Cell key={cell.iso} $state={cell.iso === today ? 'today' : future ? 'future' : 'past'} role="img" aria-label={label} title={label}>
              <Mono $mobileSize={11} $color={future ? c.faint : c.text}>{cell.day}</Mono>
              <Marks>
                {day?.musc && <Mark $color={c.lime} />}
                {game && <Mark $color={c.orange} />}
              </Marks>
            </Cell>
          );
        })}
      </Grid>
      <Legend>
        <LegendItem><Mark $color={c.lime} $width={20} />Musculação</LegendItem>
        <LegendItem><Mark $color={c.orange} $width={20} />Jogo (basquete ou futebol)</LegendItem>
        <LegendItem>
          <Marks><Mark $color={c.lime} $width={20} /><Mark $color={c.orange} $width={20} /></Marks>
          Os dois no mesmo dia
        </LegendItem>
      </Legend>
    </Panel>
  );
}
