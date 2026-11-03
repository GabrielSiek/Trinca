import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { ActivityId, Day, Plan } from '../../../../shared/types.ts';
import { BareInput, Card, Eyebrow, FieldBox, Label, Mono, Muted, Toggle } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { ddmm } from '../../lib/dates.ts';
import { decimalInput, fmt, parseDecimal, signed } from '../../lib/format.ts';
import { isGameDay } from '../../lib/nutrition.ts';
import { c, mobile } from '../../theme.ts';

const ACTIVITIES: { id: ActivityId; label: string }[] = [
  { id: 'nenhuma', label: 'Nenhuma' },
  { id: 'basquete', label: 'Basquete' },
  { id: 'futebol', label: 'Futebol' },
  { id: 'outra', label: 'Outra' },
];

const Panel = styled(Card)`
  flex: 1 1 320px;
  gap: 24px;
  padding: 28px;
  ${mobile} {
    flex: none;
    gap: 16px;
    padding: 18px;
    border-radius: 18px;
  }
`;

const Section = styled.div<{ $divided?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  ${(p) => p.$divided && `padding-top: 20px; border-top: 1px solid ${c.line};`}
  ${mobile} {
    ${(p) => p.$divided && 'padding-top: 14px;'}
  }
`;

const WeightRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  ${mobile} {
    flex-direction: row-reverse;
    flex-wrap: nowrap;
    justify-content: space-between;
  }
`;

const WeightField = styled(FieldBox)`
  width: 150px;
  height: 60px;
  padding: 0 14px;
  ${mobile} {
    width: 132px;
    height: 56px;
    padding: 0 12px;
  }
`;

const WeightInput = styled(BareInput)`
  font-size: 36px;
  font-weight: 800;
  font-stretch: 62%;
  font-variant-numeric: tabular-nums;
  ${mobile} {
    font-size: 32px;
  }
`;

const Deltas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SpreadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  ${mobile} {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Chip = styled.button.attrs({ type: 'button' })<{ $on: boolean; $neutral: boolean }>`
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  background: ${(p) => (!p.$on ? c.field : p.$neutral ? c.text : c.orange)};
  color: ${(p) => (p.$on ? c.onLime : c.text)};
  border: 1px solid ${(p) => (!p.$on ? c.lineStrong : p.$neutral ? c.text : c.orange)};
  ${mobile} {
    padding: 0 4px;
    font-size: 14px;
  }
`;

interface Props {
  day: Day;
  plan: Plan;
  focusWeight: boolean;
  onWeight: (weight: number | null) => void;
  onMusc: (on: boolean) => void;
  onActivity: (activity: ActivityId) => void;
}

export function DayLogPanel({ day, plan, focusWeight, onWeight, onMusc, onActivity }: Props) {
  const isMobile = useIsMobile();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(decimalInput(day.weight));

  useEffect(() => setDraft(decimalInput(day.weight)), [day.date, day.weight]);
  useEffect(() => {
    if (focusWeight) input.current?.focus();
  }, [focusWeight]);

  const value = parseDecimal(draft);
  const commit = () => {
    if (draft.trim() && value === null) setDraft(decimalInput(day.weight));
    else if (value !== day.weight) onWeight(value);
  };

  const goal = plan.goals;
  const activity = ACTIVITIES.find((a) => a.id === day.activity)!;
  const name = day.activity === 'outra' ? 'atividade' : activity.label.toLowerCase();
  const extraKcal = plan.dishes.find((d) => d.id === plan.extraDishId)?.kcal ?? 0;
  const note = isGameDay(day.activity)
    ? isMobile
      ? `Dia com ${name}: meta de ${fmt(goal.kcalGame)} kcal e +${fmt(extraKcal)} kcal no lanche.`
      : `Dia com ${name}: meta de ${fmt(goal.kcalGame)} kcal, ~${goal.carbsGame} g de carboidrato e +${fmt(extraKcal)} kcal no lanche (coma 1 a 2 horas antes).`
    : isMobile
      ? `Com jogo ou outra atividade, a meta sobe para ${fmt(goal.kcalGame)} kcal.`
      : `Marcou basquete, futebol ou outra atividade? A meta sobe para ${fmt(goal.kcalGame)} kcal e o lanche ganha o extra de jogo.`;

  const label = <Label htmlFor="peso">Peso em jejum</Label>;
  const deltas = (
    <Deltas>
      {isMobile && label}
      <Mono $color={c.lime} $mobileSize={11}>{value === null ? '—' : `${signed(value - day.baselineWeight)} kg`} desde {ddmm(plan.cycle.start)}</Mono>
      <Mono $mobileSize={11}>{value === null || day.previousWeight === null ? '—' : `${signed(value - day.previousWeight)} kg`} vs ontem</Mono>
    </Deltas>
  );

  return (
    <Panel aria-labelledby="registro-titulo">
      <Eyebrow as="h2" id="registro-titulo" $mobileSize={11} style={{ fontWeight: 500 }}>Registro do dia</Eyebrow>

      <Section>
        {!isMobile && label}
        <WeightRow>
          <WeightField>
            <WeightInput
              ref={input}
              id="peso"
              inputMode="decimal"
              value={draft}
              placeholder="—"
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9,.]/g, ''))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
            <span style={{ color: c.muted }}>kg</span>
          </WeightField>
          {deltas}
        </WeightRow>
      </Section>

      <Section $divided>
        <SpreadRow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span id="musc-rotulo" style={{ fontWeight: 600 }}>Musculação</span>
            <Muted>{day.musc ? (day.workoutLabel ?? 'Treino feito') : 'Não treinei hoje'}</Muted>
          </div>
          <Toggle on={day.musc} labelledBy="musc-rotulo" onClick={() => onMusc(!day.musc)} />
        </SpreadRow>
      </Section>

      <Section $divided role="group" aria-labelledby="atividade-rotulo">
        <span id="atividade-rotulo" style={{ fontWeight: 600 }}>Atividade física</span>
        <Chips>
          {ACTIVITIES.map((a) => (
            <Chip key={a.id} $on={a.id === day.activity} $neutral={a.id === 'nenhuma'} aria-pressed={a.id === day.activity} onClick={() => onActivity(a.id)}>
              {a.label}
            </Chip>
          ))}
        </Chips>
        <Muted>{note}</Muted>
      </Section>
    </Panel>
  );
}
