import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { ProgressData } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { AppShell } from '../../components/AppShell.tsx';
import { PlusIcon } from '../../components/icons.tsx';
import { toastError } from '../../components/Toast.tsx';
import { BigNumber, Button, Card, CenteredState, Eyebrow, Heading, Mono, Muted, PageTitle } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { clampDate, dateShort, ddmm, todayISO } from '../../lib/dates.ts';
import { dec, fmt, signed } from '../../lib/format.ts';
import { buildWeeks, cycleInfo, rollingMean, weekAdjustment, workoutSummary, type WeekRow } from '../../lib/progress.ts';
import { usePlan } from '../../PlanContext.tsx';
import { c, mobile, mono } from '../../theme.ts';
import { MeasuresModal } from './MeasuresModal.tsx';
import { MonthCalendar } from './MonthCalendar.tsx';
import { WeightChart } from './WeightChart.tsx';

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${mobile} {
    gap: 10px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 24px;
  ${mobile} {
    flex-wrap: nowrap;
    gap: 8px;
  }
`;

const Strip = styled.div`
  display: flex;
  gap: 3px;
  ${mobile} {
    gap: 2px;
  }
`;

const StripDay = styled.span<{ $on: boolean; $today: boolean }>`
  flex: 1 1 0;
  height: 12px;
  border-radius: 3px;
  background: ${(p) => (p.$on ? c.lime : c.lineSoft)};
  box-shadow: ${(p) => (p.$today ? `0 0 0 2px ${c.bg}, 0 0 0 4px ${c.lime}` : 'none')};
  ${mobile} {
    height: 10px;
    border-radius: 2px;
    box-shadow: ${(p) => (p.$today ? `0 0 0 1px ${c.bg}, 0 0 0 3px ${c.lime}` : 'none')};
  }
`;

const Kpis = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: 16px;
  ${mobile} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`;

const Kpi = styled.div<{ $accent?: boolean; $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  background: ${(p) => (p.$accent ? c.limeDeep : c.surface)};
  border: 1px solid ${(p) => (p.$accent ? c.lime : c.line)};
  border-radius: 18px;
  padding: 22px 24px;
  ${mobile} {
    gap: 6px;
    padding: 16px;
    border-radius: 16px;
    ${(p) => p.$wide && 'grid-column: 1 / -1;'}
  }
`;

const Figures = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  ${mobile} {
    gap: 6px;
  }
`;

const Unit = styled.span`
  font-size: 20px;
  color: ${c.muted};
  ${mobile} {
    font-size: 15px;
  }
`;

const Between = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const AdviceWord = styled.span`
  font-size: 52px;
  font-weight: 800;
  font-stretch: 62%;
  line-height: 0.9;
  text-transform: uppercase;
  ${mobile} {
    font-size: 40px;
    line-height: 0.95;
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: stretch;
  ${mobile} {
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 16px;
  }
`;

const ChartCard = styled(Card)`
  flex: 999 1 600px;
  gap: 16px;
  ${mobile} {
    flex: none;
    gap: 10px;
  }
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  ${mobile} {
    gap: 4px 14px;
  }
`;

const LegendItem = styled(Mono)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${c.dot};
`;

const Line = styled.span`
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: ${c.lime};
`;

const DashLine = styled.span`
  width: 18px;
  height: 0;
  border-top: 2px dashed ${c.text};
`;

const WeeksCard = styled(Card)`
  gap: 16px;
  ${mobile} {
    gap: 10px;
  }
`;

const WeeksHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  ${mobile} {
    flex-wrap: nowrap;
    gap: 8px;
  }
`;

const COLUMNS = '72px 84px 120px 100px 88px 88px 80px 104px 96px minmax(120px, 1fr)';

const Scroll = styled.div`
  overflow-x: auto;
`;

const Table = styled.div`
  min-width: 980px;
  display: flex;
  flex-direction: column;
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNS};
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${c.lineStrong};
  ${mono}
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${c.muted};
`;

const TableRow = styled.div<{ $current: boolean; $empty: boolean }>`
  display: grid;
  grid-template-columns: ${COLUMNS};
  gap: 12px;
  align-items: center;
  min-height: 48px;
  border-bottom: 1px solid ${c.lineSoft};
  font-variant-numeric: tabular-nums;
  background: ${(p) => (p.$current ? c.limeDeep : 'transparent')};
  color: ${(p) => (p.$empty ? c.faint : c.text)};
`;

const Cell = styled.span`
  ${mono}
  font-size: 13px;
`;

const MeanCell = styled.span`
  font-size: 20px;
  font-weight: 800;
  font-stretch: 68%;
`;

const MobileWeek = styled.div<{ $current: boolean; $empty: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 8px;
  border-bottom: 1px solid ${c.lineSoft};
  border-radius: 8px;
  background: ${(p) => (p.$current ? c.limeDeep : 'transparent')};
  color: ${(p) => (p.$empty ? c.faint : c.text)};
`;

const cm = (value: number | null | undefined) => (value === null || value === undefined ? null : dec(value, Number.isInteger(value) ? 0 : 1));

function weekDetail(week: WeekRow): string {
  const parts: string[] = [];
  if (week.measure) parts.push(`Barriga ${cm(week.measure.belly) ?? '—'} · umbigo ${cm(week.measure.navel) ?? '—'} · braço ${cm(week.measure.arm) ?? '—'}`);
  else if (week.current) parts.push('Medidas pendentes');
  if (week.n > 0 && week.musc !== null) parts.push(`M ${week.musc} · jogos ${week.activity}`);
  if (week.advice && week.mean !== null) parts.push(week.advice.toLowerCase());
  return parts.join(' · ');
}

export function ProgressPage() {
  const { plan } = usePlan();
  const { cycle } = plan;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [data, setData] = useState<ProgressData | null>(null);
  const [measuring, setMeasuring] = useState(false);

  useEffect(() => {
    api.progress().then(setData, toastError);
  }, []);

  const logWeight = (
    <Button $variant="neutral" onClick={() => navigate('/', { state: { focusWeight: true } })} style={{ background: c.surface, borderColor: c.line, padding: isMobile ? '0 14px' : undefined }}>
      <PlusIcon size={isMobile ? 16 : 18} width={isMobile ? 2.4 : 2.2} />
      Registrar peso
    </Button>
  );

  if (!data) return <AppShell right={logWeight}><CenteredState>Carregando…</CenteredState></AppShell>;

  const today = clampDate(todayISO(), cycle.start, cycleInfo(cycle, todayISO()).end);
  const info = cycleInfo(cycle, today);
  const weeks = buildWeeks(cycle, data, today);
  const adjustment = weekAdjustment(cycle, weeks, today);
  const summary = workoutSummary(cycle, data, today);
  const mean = rollingMean(data.days, today);
  const baseline = data.days.find((d) => d.date === cycle.start)?.weight ?? cycle.startWeight;
  const sinceStart = mean === null ? '—' : `${signed(mean - baseline)} kg desde ${ddmm(cycle.start)}`;
  const goalText = `Meta${isMobile ? '' : ' em'} ${ddmm(info.end)}: ~${dec(cycle.targetWeight)} kg`;
  const measureToday = data.measures.find((m) => m.date === today) ?? null;
  const measureBefore = [...data.measures].reverse().find((m) => m.date < today) ?? null;
  const doneText = `${info.daysDone} ${info.daysDone === 1 ? 'dia feito' : 'dias feitos'}, ${info.daysLeft} pela frente`;
  const reviewDate = adjustment.nextReview && ddmm(adjustment.nextReview);

  const measureCell = (value: number | null | undefined, week: WeekRow) => cm(value) ?? (week.current && !week.measure ? 'medir' : '—');

  return (
    <AppShell right={logWeight}>
      <TitleBlock>
        <TitleRow>
          <PageTitle>Progresso</PageTitle>
          <Mono $size={13} $mobileSize={11}>
            {isMobile ? `${ddmm(cycle.start)} → ${ddmm(info.end)}` : `${dateShort(cycle.start)} → ${dateShort(info.end)} · ${doneText}`}
          </Mono>
        </TitleRow>
        <Strip aria-hidden="true">
          {Array.from({ length: cycle.days }, (_, i) => <StripDay key={i} $on={i <= info.index} $today={i === info.index} />)}
        </Strip>
        {isMobile && <Mono $size={11}>{doneText}</Mono>}
      </TitleBlock>

      <Kpis>
        <Kpi $wide>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Eyebrow $size={10}>Peso · média 7 dias</Eyebrow>
                <Figures>
                  <BigNumber $size={56}>{mean === null ? '—' : dec(mean)}</BigNumber>
                  <Unit style={{ fontSize: 16 }}>kg</Unit>
                </Figures>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, textAlign: 'right' }}>
                <Mono $color={c.lime}>{sinceStart}</Mono>
                <Muted>{goalText}</Muted>
              </div>
            </div>
          ) : (
            <>
              <Eyebrow>Peso · média 7 dias</Eyebrow>
              <Figures>
                <BigNumber $size={64}>{mean === null ? '—' : dec(mean)}</BigNumber>
                <Unit>kg</Unit>
              </Figures>
              <Mono $color={c.lime}>{sinceStart}</Mono>
              <Muted>{goalText}</Muted>
            </>
          )}
        </Kpi>

        <Kpi>
          <Eyebrow $mobileSize={10}>Musculação</Eyebrow>
          <Figures>
            <BigNumber $size={64} $mobile={48} $color={c.lime}>{summary.musc}</BigNumber>
            <Unit>{summary.musc === 1 ? 'dia' : 'dias'}</Unit>
          </Figures>
          <Mono $color={isMobile ? c.muted : c.text}>≈ {summary.perWeek} por semana</Mono>
          {!isMobile && <Muted>Plano: {cycle.weeklyWorkouts} por semana</Muted>}
        </Kpi>

        <Kpi>
          <Eyebrow $mobileSize={10}>{isMobile ? 'Atividade' : 'Atividade física'}</Eyebrow>
          <Figures>
            <BigNumber $size={64} $mobile={48} $color={c.orange}>{summary.activity}</BigNumber>
            <Unit>{summary.activity === 1 ? 'dia' : 'dias'}</Unit>
          </Figures>
          {!isMobile && <Mono $color={c.text}>{summary.breakdown || 'Nenhuma ainda'}</Mono>}
          <Muted $size={isMobile ? 12 : 13}>{isMobile ? `${summary.both} junto com musculação` : `${summary.both} no mesmo dia da musculação`}</Muted>
        </Kpi>

        <Kpi $accent $wide>
          {isMobile ? (
            <Between>
              <Eyebrow $size={10} $color={c.lime}>Ajuste da semana</Eyebrow>
              {reviewDate && <Mono $size={11}>revisão: {reviewDate}</Mono>}
            </Between>
          ) : (
            <Eyebrow $color={c.lime}>Ajuste da semana</Eyebrow>
          )}
          <AdviceWord>{adjustment.title}</AdviceWord>
          <span style={{ fontSize: isMobile ? 13 : 14, textWrap: 'pretty' }}>{adjustment.text}</span>
          {!isMobile && reviewDate && <Mono>Próxima revisão: {reviewDate}</Mono>}
        </Kpi>
      </Kpis>

      <Row>
        <ChartCard aria-labelledby="peso-titulo">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px 24px' }}>
            <Heading id="peso-titulo">Peso</Heading>
            {!isMobile && (
              <LegendRow>
                <LegendItem><Dot />Pesagem do dia</LegendItem>
                <LegendItem><Line />Média 7 dias</LegendItem>
                <LegendItem><DashLine />Ritmo da meta (−{dec(cycle.weeklyRate)} kg/sem)</LegendItem>
              </LegendRow>
            )}
          </div>
          <WeightChart cycle={cycle} days={data.days} today={today} />
          {isMobile && (
            <LegendRow>
              <LegendItem $size={11}><Dot />Pesagem</LegendItem>
              <LegendItem $size={11}><Line />Média 7 dias</LegendItem>
              <LegendItem $size={11}><DashLine />Ritmo da meta</LegendItem>
            </LegendRow>
          )}
        </ChartCard>

        <MonthCalendar days={data.days} today={today} />
      </Row>

      <WeeksCard aria-labelledby="semanas-titulo">
        <WeeksHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Heading id="semanas-titulo">{isMobile ? 'Semanas' : 'Semana a semana'}</Heading>
            {!isMobile && <Muted>Peso em jejum todo dia; medidas uma vez por semana, no mesmo dia.</Muted>}
          </div>
          <Button $variant="primary" onClick={() => setMeasuring(true)} style={{ flex: 'none', padding: isMobile ? '0 14px' : undefined }}>
            {!isMobile && <PlusIcon />}
            {isMobile ? 'Medir hoje' : 'Registrar medidas de hoje'}
          </Button>
        </WeeksHead>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {weeks.map((week) => {
              const detail = weekDetail(week);
              return (
                <MobileWeek key={week.n} $current={week.current} $empty={week.mean === null}>
                  <Between>
                    <Mono $color="inherit">Sem. {week.n} · {ddmm(week.date)}</Mono>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {week.change !== null && <Mono $color={week.change < 0 ? c.lime : c.muted}>{signed(week.change, 2)}</Mono>}
                      <MeanCell style={{ fontSize: 22 }}>{week.mean === null ? '—' : dec(week.mean)}</MeanCell>
                    </span>
                  </Between>
                  {detail && <Mono $size={11}>{detail}</Mono>}
                </MobileWeek>
              );
            })}
          </div>
        ) : (
          <Scroll>
            <Table>
              <TableHead>
                <span>Semana</span><span>Fecha</span><span>Média peso</span><span>Variação</span><span>Barriga</span><span>Umbigo</span><span>Braço</span><span>Musculação</span><span>Atividade</span><span>Ajuste</span>
              </TableHead>
              {weeks.map((week) => (
                <TableRow key={week.n} $current={week.current} $empty={week.mean === null}>
                  <Cell>{week.n}</Cell>
                  <Cell>{ddmm(week.date)}</Cell>
                  <MeanCell>{week.mean === null ? '—' : dec(week.mean)}</MeanCell>
                  <Cell style={{ color: week.change !== null && week.change < 0 ? c.lime : c.muted }}>{week.change === null ? '—' : `${signed(week.change, 2)} kg`}</Cell>
                  <Cell>{measureCell(week.measure?.belly, week)}</Cell>
                  <Cell>{measureCell(week.measure?.navel, week)}</Cell>
                  <Cell>{measureCell(week.measure?.arm, week)}</Cell>
                  <Cell>{week.musc === null ? '—' : fmt(week.musc)}</Cell>
                  <Cell>{week.activity === null ? '—' : fmt(week.activity)}</Cell>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{week.advice}</span>
                </TableRow>
              ))}
            </Table>
          </Scroll>
        )}
      </WeeksCard>

      {measuring && (
        <MeasuresModal
          date={today}
          existing={measureToday}
          previous={measureBefore}
          onClose={() => setMeasuring(false)}
          onSave={(values) => {
            setMeasuring(false);
            api.saveMeasures(today, values).then(setData, toastError);
          }}
        />
      )}
    </AppShell>
  );
}
