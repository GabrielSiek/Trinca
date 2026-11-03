import styled from 'styled-components';
import type { Day, Plan } from '../../../../shared/types.ts';
import { BigNumber, Card, Eyebrow, Mono } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { fmt } from '../../lib/format.ts';
import { calorieBar, dayGoals, dayTotals, isGameDay, macroView, type MacroView, type MealView } from '../../lib/nutrition.ts';
import { c, hatch, mobile, mono } from '../../theme.ts';

const Panel = styled(Card)`
  flex: 999 1 620px;
  gap: 28px;
  padding: 28px;
  ${mobile} {
    flex: none;
    gap: 18px;
    padding: 18px;
    border-radius: 18px;
  }
`;

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 32px;
`;

const Stack = styled.div<{ $gap?: number; $end?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 10}px;
  ${(p) => p.$end && 'align-items: flex-end; text-align: right;'}
`;

const Baseline = styled.div<{ $spread?: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 12px;
  ${(p) => p.$spread && 'justify-content: space-between;'}
  ${mobile} {
    gap: 8px;
  }
`;

const OfGoal = styled.span`
  font-size: 24px;
  font-weight: 600;
  font-stretch: 75%;
  color: ${c.muted};
  ${mobile} {
    font-size: 18px;
  }
`;

const Remaining = styled.span`
  font-size: 20px;
  font-weight: 700;
  ${mobile} {
    font-size: 15px;
    text-align: right;
  }
`;

const BarArea = styled.div`
  position: relative;
  padding-top: 24px;
  ${mobile} {
    padding-top: 18px;
  }
`;

const GoalLabel = styled.span`
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  ${mono}
  font-size: 11px;
  color: ${c.text};
  white-space: nowrap;
  ${mobile} {
    font-size: 10px;
  }
`;

const GoalMarker = styled.div`
  position: absolute;
  top: 18px;
  bottom: -6px;
  width: 2px;
  margin-left: -1px;
  background: ${c.text};
  border-radius: 2px;
  ${mobile} {
    top: 14px;
    bottom: -5px;
  }
`;

const Bar = styled.div`
  display: flex;
  gap: 3px;
  height: 52px;
  padding: 3px;
  background: ${c.well};
  border: 1px solid ${c.line};
  border-radius: 12px;
  ${mobile} {
    gap: 2px;
    height: 40px;
    border-radius: 10px;
  }
`;

const Segment = styled.div<{ $done: boolean }>`
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 9px;
  overflow: hidden;
  white-space: nowrap;
  ${mono}
  font-size: 12px;
  font-weight: 500;
  background: ${(p) => (p.$done ? c.lime : hatch(6))};
  border: 1px ${(p) => (p.$done ? `solid ${c.lime}` : `dashed ${c.check}`)};
  color: ${(p) => (p.$done ? c.onLime : '#C9CFC2')};
  ${mobile} {
    justify-content: center;
    padding: 0;
    border-radius: 7px;
    font-size: 11px;
    background: ${(p) => (p.$done ? c.lime : hatch(5))};
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
`;

const LegendItem = styled(Mono)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Swatch = styled.span<{ $done?: boolean }>`
  width: 14px;
  height: 10px;
  border-radius: 3px;
  background: ${(p) => (p.$done ? c.lime : c.field)};
  ${(p) => !p.$done && `border: 1px dashed ${c.check};`}
`;

const Macros = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: 24px 32px;
  padding-top: 24px;
  border-top: 1px solid ${c.line};
  ${mobile} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    padding-top: 16px;
  }
`;

const MacroValue = styled.span`
  font-size: 44px;
  font-weight: 800;
  font-stretch: 62%;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
  ${mobile} {
    font-size: 32px;
  }
`;

const MacroGoal = styled.span`
  font-size: 15px;
  color: ${c.muted};
  ${mobile} {
    font-size: 12px;
  }
`;

const Track = styled.div`
  position: relative;
  height: 14px;
  background: ${c.well};
  border: 1px solid ${c.line};
  border-radius: 999px;
  overflow: hidden;
  ${mobile} {
    height: 10px;
  }
`;

const TrackFill = styled.div<{ $planned?: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: ${(p) => (p.$planned ? 'repeating-linear-gradient(135deg, #2A2F27 0 5px, #1A1D18 5px 10px)' : c.lime)};
  ${(p) => !p.$planned && 'border-radius: 999px;'}
`;

const TrackBand = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 2px solid ${c.text};
  border-right: 2px solid ${c.text};
  background: rgba(237, 240, 232, 0.1);
`;

const TONE = { muted: c.muted, ok: c.lime, over: c.orange };

function MacroBlock({ macro, isMobile }: { macro: MacroView; isMobile: boolean }) {
  const track = (
    <Track>
      <TrackFill $planned style={{ width: macro.planW }} />
      <TrackFill style={{ width: macro.fillW }} />
      <TrackBand aria-hidden="true" style={{ left: macro.bandL, width: macro.bandW }} />
    </Track>
  );
  if (isMobile) {
    return (
      <Stack $gap={6} style={{ minWidth: 0 }}>
        <Eyebrow $size={10} style={{ letterSpacing: '0.06em' }}>{macro.name}</Eyebrow>
        <MacroValue>{macro.value}</MacroValue>
        <MacroGoal>/ {macro.goal}</MacroGoal>
        {track}
        <Mono $size={11} $color={TONE[macro.tone]}>{macro.status.replace(' acima', '')}</Mono>
      </Stack>
    );
  }
  return (
    <Stack>
      <Baseline $spread>
        <Eyebrow>{macro.name}</Eyebrow>
        <Mono $color={TONE[macro.tone]}>{macro.status}</Mono>
      </Baseline>
      <Baseline style={{ gap: 8 }}>
        <MacroValue>{macro.value}</MacroValue>
        <MacroGoal>/ {macro.goal}</MacroGoal>
      </Baseline>
      {track}
    </Stack>
  );
}

export function GoalsPanel({ day, plan, meals }: { day: Day; plan: Plan; meals: MealView[] }) {
  const isMobile = useIsMobile();
  const game = isGameDay(day.activity);
  const goal = dayGoals(day.activity, plan.goals);
  const { eaten, planned } = dayTotals(meals);
  const bar = calorieBar(meals, goal.kcal, planned.kcal, eaten.kcal);
  const left = goal.kcal - eaten.kcal;
  const overPlan = planned.kcal - goal.kcal;
  const planSign = overPlan > 0 ? '+' : overPlan < 0 ? '−' : '±';
  const { proteinMin, proteinMax, fatMin, fatMax } = plan.goals;

  const macros = [
    macroView('Proteína', eaten.p, planned.p, proteinMin, proteinMax, false),
    macroView(isMobile ? 'Carbo' : 'Carboidrato', eaten.c, planned.c, goal.carbs, goal.carbs, true),
    macroView('Gordura', eaten.g, planned.g, fatMin, fatMax, false),
  ];
  const gameText = game ? 'dia com jogo' : 'dia sem jogo';
  const planText = `Plano do dia: ${fmt(planned.kcal)} kcal (${planSign}${fmt(Math.abs(overPlan))}${isMobile ? ' da meta' : ''})`;

  return (
    <Panel aria-label="Metas do dia">
      {isMobile ? (
        <Stack $gap={8}>
          <Eyebrow $size={11}>Calorias · {gameText}</Eyebrow>
          <Baseline $spread>
            <Baseline>
              <BigNumber $size={72} $color={c.lime}>{fmt(eaten.kcal)}</BigNumber>
              <OfGoal>/ {fmt(goal.kcal)}</OfGoal>
            </Baseline>
            <Remaining>{left >= 0 ? `faltam ${fmt(left)}` : `${fmt(-left)} acima`}</Remaining>
          </Baseline>
        </Stack>
      ) : (
        <Summary>
          <Stack>
            <Eyebrow>Calorias · meta {fmt(goal.kcal)} · {gameText}</Eyebrow>
            <Baseline>
              <BigNumber $size={88} $color={c.lime}>{fmt(eaten.kcal)}</BigNumber>
              <OfGoal>/ {fmt(goal.kcal)} kcal</OfGoal>
            </Baseline>
          </Stack>
          <Stack $gap={4} $end>
            <Remaining>{left >= 0 ? `faltam ${fmt(left)} kcal` : `${fmt(-left)} kcal acima da meta`}</Remaining>
            <Mono>{planText}</Mono>
          </Stack>
        </Summary>
      )}

      <Stack>
        <BarArea>
          <GoalLabel style={{ left: bar.goalAt }}>meta</GoalLabel>
          <Bar>
            {bar.segments.map((segment) => (
              <Segment key={segment.id} $done={segment.done} style={{ flexBasis: segment.width }}>
                {isMobile ? fmt(segment.kcal) : segment.label}
              </Segment>
            ))}
          </Bar>
          <GoalMarker aria-hidden="true" style={{ left: bar.goalAt }} />
        </BarArea>
        {isMobile ? (
          <Mono $size={11}>{planText}</Mono>
        ) : (
          <Legend>
            <LegendItem><Swatch $done />Comido</LegendItem>
            <LegendItem><Swatch />Planejado, ainda não marcado</LegendItem>
          </Legend>
        )}
      </Stack>

      <Macros>
        {macros.map((macro) => <MacroBlock key={macro.name} macro={macro} isMobile={isMobile} />)}
      </Macros>
    </Panel>
  );
}
