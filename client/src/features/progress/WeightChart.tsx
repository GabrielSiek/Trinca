import styled from 'styled-components';
import type { Cycle, ProgressDay } from '../../../../shared/types.ts';
import { useIsMobile } from '../../hooks.ts';
import { addDays, ddmm, diffDays } from '../../lib/dates.ts';
import { dec } from '../../lib/format.ts';
import { rollingMean } from '../../lib/progress.ts';
import { c } from '../../theme.ts';

const Svg = styled.svg`
  width: 100%;
  height: auto;
  display: block;
`;

const MONO = 'JetBrains Mono, ui-monospace, monospace';

const DESKTOP = { width: 720, height: 300, left: 56, right: 700, top: 20, bottom: 260, tick: 11, dot: 3.5, line: 3, tickDays: [0, 14, 28, 42], labelGap: 12, big: 20 };
const MOBILE = { width: 360, height: 206, left: 34, right: 350, top: 12, bottom: 180, tick: 10, dot: 2.8, line: 2.5, tickDays: [0, 14, 28], labelGap: 10, big: 16 };

interface Props {
  cycle: Cycle;
  days: ProgressDay[];
  today: string;
}

export function WeightChart({ cycle, days, today }: Props) {
  const isMobile = useIsMobile();
  const box = isMobile ? MOBILE : DESKTOP;
  const lastIndex = cycle.days - 1;
  const inCycle = days.filter((d) => d.weight !== null && d.date >= cycle.start && d.date <= today);

  const weights = [cycle.startWeight, cycle.targetWeight, ...inCycle.map((d) => d.weight as number)];
  const yMax = Math.ceil(Math.max(...weights) + 0.1);
  const yMin = Math.floor(Math.min(...weights)) - 0.5;

  const x = (dayIndex: number) => box.left + (dayIndex * (box.right - box.left)) / lastIndex;
  const y = (weight: number) => box.top + ((yMax - weight) / (yMax - yMin)) * (box.bottom - box.top);

  const todayIndex = Math.max(0, Math.min(lastIndex, diffDays(cycle.start, today)));
  const points = inCycle.map((d) => ({ index: diffDays(cycle.start, d.date), weight: d.weight as number, mean: rollingMean(days, d.date) as number }));
  const last = points[points.length - 1];

  const ticks: number[] = [];
  for (let w = yMax; w >= yMin; w--) ticks.push(w);

  // Near the top the value would land on the "hoje" label, so it drops below the point.
  const nearTop = !!last && y(last.mean) - box.labelGap < box.top + 28;
  const valueY = last ? y(last.mean) + (nearTop ? box.labelGap + box.big * 0.8 : -box.labelGap) : 0;

  const describe = last
    ? `Peso: média de 7 dias em ${dec(last.mean)} kg, com meta de ~${dec(cycle.targetWeight)} kg em ${ddmm(addDays(cycle.start, lastIndex))}`
    : 'Nenhuma pesagem registrada ainda';

  return (
    <Svg viewBox={`0 0 ${box.width} ${box.height}`} role="img" aria-label={describe}>
      <rect x={x(todayIndex)} y={box.top} width={box.right - x(todayIndex)} height={box.bottom - box.top} fill={c.future} />
      <g stroke={c.line} strokeWidth="1">
        {ticks.map((w) => <line key={w} x1={box.left} y1={y(w)} x2={box.right} y2={y(w)} />)}
        <line x1={box.left} y1={box.bottom} x2={box.right} y2={box.bottom} />
      </g>
      <g fontFamily={MONO} fontSize={box.tick} fill={c.muted} textAnchor="end">
        {ticks.map((w) => <text key={w} x={box.left - (isMobile ? 8 : 10)} y={y(w) + 4}>{w}</text>)}
      </g>
      <g fontFamily={MONO} fontSize={box.tick} fill={c.muted} textAnchor="middle">
        {box.tickDays.map((d) => (
          <text key={d} x={x(d)} y={box.height - (isMobile ? 8 : 18)} textAnchor={d === 0 ? 'start' : 'middle'}>{ddmm(addDays(cycle.start, d))}</text>
        ))}
        <text x={box.right} y={box.height - (isMobile ? 8 : 18)} textAnchor="end">{ddmm(addDays(cycle.start, lastIndex))}</text>
      </g>
      <line x1={x(0)} y1={y(cycle.startWeight)} x2={x(lastIndex)} y2={y(cycle.targetWeight)} stroke={c.text} strokeWidth="1.5" strokeDasharray={isMobile ? '5 5' : '6 6'} />
      <text x={box.right - 6} y={y(cycle.targetWeight) + box.tick + 6} fontFamily={MONO} fontSize={box.tick} fill={c.text} textAnchor="end">meta ~{dec(cycle.targetWeight)}</text>
      <line x1={x(todayIndex)} y1={box.top} x2={x(todayIndex)} y2={box.bottom} stroke={c.dash} strokeWidth="1" />
      <text x={x(todayIndex) + (isMobile ? 6 : 8)} y={box.top + 16} fontFamily={MONO} fontSize={box.tick} fill={c.text}>hoje</text>
      {points.map((p) => <circle key={p.index} cx={x(p.index)} cy={y(p.weight)} r={box.dot} fill={c.dot} />)}
      {points.length > 1 && (
        <polyline points={points.map((p) => `${x(p.index).toFixed(1)},${y(p.mean).toFixed(1)}`).join(' ')} fill="none" stroke={c.lime} strokeWidth={box.line} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {last && (
        <>
          <circle cx={x(last.index)} cy={y(last.mean)} r={isMobile ? 5 : 6} fill={c.lime} stroke={c.surface} strokeWidth={isMobile ? 2.5 : 3} />
          <text x={x(last.index) + box.labelGap} y={valueY} fontFamily="'Archivo Variable', Arial Narrow, sans-serif" fontSize={box.big} fontWeight="800" fill={c.lime}>{dec(last.mean)}</text>
        </>
      )}
    </Svg>
  );
}
