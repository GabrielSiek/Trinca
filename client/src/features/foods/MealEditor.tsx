import { useState } from 'react';
import styled from 'styled-components';
import type { Day, Food, LoggedItem, MealId, Plan, Swap } from '../../../../shared/types.ts';
import { Modal, ModalBody, ModalFooter } from '../../components/Modal.tsx';
import { BigNumber, Button, Eyebrow, Heading, Label, Mono, Muted, Segmented } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { dateLong, dateShort, weekday, weekdayShort } from '../../lib/dates.ts';
import { fmt } from '../../lib/format.ts';
import {
  dayGoals, dayTotals, equivalentChoice, foodChoice, mealSaveLabel, type ItemView, type MealView, type SwapChoice,
} from '../../lib/nutrition.ts';
import { c, mobile } from '../../theme.ts';
import { FoodBuilder, useBuilder, type Builder } from './FoodBuilder.tsx';
import { FoodFormModal } from './FoodFormModal.tsx';
import { foodKey, FoodSearch, rememberFood } from './FoodSearch.tsx';

export interface EditorTarget {
  tab: Tab;
  mealId?: MealId;
  itemKey?: string;
}

type Tab = 'improvisada' | 'trocar';

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  ${mobile} {
    gap: 8px;
  }
`;

const MealGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
  gap: 8px;
  ${mobile} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
`;

const MealChoice = styled.button.attrs({ type: 'button' })<{ $on: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 44px;
  padding: 10px 14px;
  text-align: left;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  background: ${(p) => (p.$on ? c.limeTint : c.tile)};
  border: 1.5px solid ${(p) => (p.$on ? c.lime : c.line)};
  color: ${c.text};
  ${mobile} {
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    font-size: 14px;
    border-radius: 10px;
  }
`;

const TotalBox = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px 22px;
  background: ${c.bg};
  border: 1px solid ${c.line};
  border-radius: 16px;
  ${mobile} {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 6px;
    padding: 16px;
    border-radius: 14px;
  }
`;

const Stack = styled.div<{ $end?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${(p) => p.$end && 'text-align: right; align-items: flex-end;'}
`;

const Baseline = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const Current = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 18px 22px;
  background: ${c.bg};
  border: 1px solid ${c.line};
  border-radius: 16px;
  ${mobile} {
    padding: 14px 16px;
    border-radius: 14px;
  }
`;

const CurrentName = styled.span`
  font-size: 26px;
  font-weight: 700;
  font-stretch: 78%;
  ${mobile} {
    font-size: 22px;
  }
`;

const EquivalentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
  gap: 8px;
`;

const Choice = styled.button.attrs({ type: 'button' })<{ $on: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 10px 16px;
  text-align: left;
  border-radius: 12px;
  cursor: pointer;
  background: ${(p) => (p.$on ? c.limeTint : c.tile)};
  border: 1.5px solid ${(p) => (p.$on ? c.lime : c.line)};
  color: ${c.text};
  ${mobile} {
    min-height: 56px;
    padding: 8px 14px;
  }
`;

const ChoiceName = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 600;
`;

const Amount = styled.span<{ $on: boolean }>`
  flex: none;
  font-size: 22px;
  font-weight: 800;
  font-stretch: 68%;
  color: ${(p) => (p.$on ? c.lime : c.text)};
  ${mobile} {
    font-size: 20px;
  }
`;

const PickRow = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 46px;
  padding: 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid ${c.lineSoft};
  color: ${c.text};
  text-align: left;
  cursor: pointer;
  &:hover {
    color: ${c.lime};
  }
`;

const ExampleText = 'PF no restaurante: uns 150 g de frango grelhado, arroz, feijão, um pouco de farofa e salada com azeite. Uma Coca Zero.';

function planText(meal: MealView): string {
  if (meal.dish.kind === 'option') return `Opção ${meal.dish.code} · ${meal.dish.name}`;
  return meal.id === 'cafe' ? 'café da manhã fixo' : 'lanche fixo';
}

const planKcal = (meal: MealView) => (meal.improvised ? meal.dish.kcal : meal.macros.kcal);

interface ImprovisedProps {
  day: Day;
  plan: Plan;
  meals: MealView[];
  builder: Builder;
  mealId: MealId;
  onMeal: (id: MealId) => void;
  onSave: () => void;
  onClose: () => void;
}

function ImprovisedTab({ day, plan, meals, builder, mealId, onMeal, onSave, onClose }: ImprovisedProps) {
  const isMobile = useIsMobile();
  const meal = meals.find((m) => m.id === mealId)!;
  const { total } = builder;
  const kcalPlan = planKcal(meal);
  const dif = total.kcal - kcalPlan;
  const sign = dif > 0 ? '+' : dif < 0 ? '−' : '±';
  const dayKcal = dayTotals(meals).planned.kcal - meal.macros.kcal + total.kcal;
  const goal = dayGoals(day.activity, plan.goals).kcal;
  const difText = isMobile
    ? `${sign}${fmt(Math.abs(dif))} kcal vs. o plano (${fmt(kcalPlan)})`
    : `${sign}${fmt(Math.abs(dif))} kcal ${dif > 0 ? 'a mais' : 'a menos'} que o plano`;
  const canSave = builder.items.length > 0 && !builder.unresolved;

  return (
    <>
      <ModalBody>
        <Group role="group" aria-labelledby="substitui-rotulo">
          <span id="substitui-rotulo" style={{ fontWeight: 600 }}>{isMobile ? 'Substitui qual refeição?' : 'Qual refeição ela substitui?'}</span>
          <MealGrid>
            {meals.map((m) => (
              <MealChoice key={m.id} $on={m.id === mealId} aria-pressed={m.id === mealId} onClick={() => onMeal(m.id)}>
                {m.short}
                {!isMobile && <Mono style={{ fontWeight: 400 }}>plano: {fmt(planKcal(m))} kcal</Mono>}
              </MealChoice>
            ))}
          </MealGrid>
        </Group>

        <FoodBuilder builder={builder} textLabel="O que você comeu" placeholder={ExampleText} />

        <TotalBox>
          <Stack>
            {isMobile ? (
              <Baseline>
                <Eyebrow $size={10}>Total</Eyebrow>
                <Mono $color={c.text}>P {fmt(total.p)} · C {fmt(total.c)} · G {fmt(total.g)}</Mono>
              </Baseline>
            ) : (
              <Eyebrow>Total da refeição</Eyebrow>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <BigNumber $size={64} $mobile={52} $color={c.lime}>{fmt(total.kcal)}</BigNumber>
              <span style={{ fontSize: isMobile ? 16 : 18, color: c.muted }}>kcal</span>
            </div>
            {!isMobile && <Mono $size={13} $color={c.text}>P {fmt(total.p)} g · C {fmt(total.c)} g · G {fmt(total.g)} g</Mono>}
          </Stack>
          <Stack $end={!isMobile}>
            {!isMobile && <Muted $size={14}>No lugar de: {planText(meal)} ({fmt(kcalPlan)} kcal)</Muted>}
            <span style={{ fontSize: isMobile ? 14 : 20, fontWeight: 700, color: dif > 150 ? c.orange : c.lime }}>{difText}</span>
            <Mono $mobileSize={11}>O dia fica em {fmt(dayKcal)} de {fmt(goal)} kcal</Mono>
          </Stack>
        </TotalBox>
        {builder.unresolved > 0 && <Muted>Resolva ou remova os alimentos não encontrados para salvar.</Muted>}
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={isMobile ? 52 : 48} onClick={onClose}>Cancelar</Button>
        <Button $variant="primary" $height={isMobile ? 52 : 48} disabled={!canSave} onClick={onSave}>{mealSaveLabel(mealId)}</Button>
      </ModalFooter>
    </>
  );
}

interface SwapProps {
  plan: Plan;
  meals: MealView[];
  target: { mealId: MealId; item: ItemView } | null;
  onPick: (mealId: MealId, itemKey: string) => void;
  onSave: (mealId: MealId, swap: Swap) => void;
  onRevert: (mealId: MealId, itemId: number) => void;
  onClose: () => void;
}

function ItemPicker({ meals, onPick, onClose }: Pick<SwapProps, 'meals' | 'onPick' | 'onClose'>) {
  const open = meals.filter((m) => !m.improvised);
  return (
    <>
      <ModalBody>
        <Muted $size={15}>Escolha o alimento que você quer trocar.</Muted>
        {open.map((meal) => (
          <Group key={meal.id}>
            <Eyebrow>{meal.name}</Eyebrow>
            <div>
              {meal.items.map((item) => (
                <PickRow key={item.key} onClick={() => onPick(meal.id, item.key)}>{item.label}</PickRow>
              ))}
            </div>
          </Group>
        ))}
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Cancelar</Button>
      </ModalFooter>
    </>
  );
}

function SwapTab({ plan, meals, target, onPick, onSave, onRevert, onClose }: SwapProps) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ key: string; choice: SwapChoice; food?: Food } | null>(null);
  const [manualName, setManualName] = useState<string | null>(null);

  if (!target) return <ItemPicker meals={meals} onPick={onPick} onClose={onClose} />;

  const meal = meals.find((m) => m.id === target.mealId)!;
  const original = target.item.dishItem!;
  const kcal = original.kcal;
  const equivalents = original.swapKey && kcal > 0 ? plan.equivalents.filter((eq) => eq.key !== original.swapKey) : [];

  const commit = () => {
    if (!selected) return;
    if (selected.food) void rememberFood(selected.food);
    onSave(meal.id, { itemId: original.id, label: selected.choice.label, ...selected.choice.macros });
  };

  const pickFood = (food: Food) => setSelected({ key: foodKey(food), choice: foodChoice(food, kcal), food });

  return (
    <>
      <ModalBody>
        <Current>
          <Stack style={{ gap: 4 }}>
            <Eyebrow $mobileSize={10}>{meal.short} · {meal.sub} · trocando</Eyebrow>
            <CurrentName>{target.item.label}</CurrentName>
          </Stack>
          <Mono $size={13} $color={c.text} $mobileSize={12}>≈ {fmt(kcal)} kcal · C {fmt(original.c)} g</Mono>
        </Current>

        {equivalents.length > 0 && (
          <Group>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: isMobile ? 0 : '6px 16px' }}>
              <Heading $size={24} $mobile={22}>Equivalentes do plano</Heading>
              <Muted>Mesmas calorias, pela tabela de trocas{isMobile ? '' : ' da dieta'}</Muted>
            </div>
            <EquivalentGrid>
              {equivalents.map((eq) => {
                const choice = equivalentChoice(eq, kcal);
                const on = selected?.key === eq.key;
                return (
                  <Choice key={eq.key} $on={on} aria-pressed={on} onClick={() => setSelected({ key: eq.key, choice })}>
                    <ChoiceName>
                      {eq.name}
                      <Mono $mobileSize={11} style={{ fontWeight: 400 }}>{eq.note ?? `≈ ${fmt(kcal)} kcal`}</Mono>
                    </ChoiceName>
                    <Amount $on={on}>{choice.qtyText}</Amount>
                  </Choice>
                );
              })}
            </EquivalentGrid>
          </Group>
        )}

        <Group>
          <Heading as={Label} htmlFor="busca-troca" style={{ display: 'block' }} $size={24} $mobile={22}>{isMobile ? 'Buscar outro' : 'Buscar outro alimento'}</Heading>
          <FoodSearch
            id="busca-troca"
            label="Buscar outro alimento"
            placeholder="Busca na TACO e no Open Food Facts"
            query={query}
            onQuery={setQuery}
            onPick={pickFood}
            onManual={setManualName}
            selected={selected?.key}
            trailing={(food) => {
              const on = selected?.key === foodKey(food);
              return (
                <span style={{ flex: 'none', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  {!isMobile && kcal > 0 && <Mono>para igualar</Mono>}
                  <Amount $on={on}>{foodChoice(food, kcal).qtyText}</Amount>
                </span>
              );
            }}
          />
        </Group>
      </ModalBody>
      <ModalFooter>
        {target.item.swapped && (
          <Button $variant="quiet" $height={isMobile ? 52 : 48} onClick={() => onRevert(meal.id, original.id)} style={isMobile ? { flex: 'none', padding: '0 14px' } : { marginRight: 'auto' }}>
            {isMobile ? 'Original' : `Voltar para ${original.label}`}
          </Button>
        )}
        <Button $variant="quiet" $height={isMobile ? 52 : 48} onClick={onClose}>Cancelar</Button>
        <Button $variant="primary" $height={isMobile ? 52 : 48} disabled={!selected} onClick={commit}>
          {selected ? `Trocar por ${selected.choice.label}` : 'Escolha uma opção'}
        </Button>
      </ModalFooter>

      {manualName !== null && (
        <FoodFormModal
          initialName={manualName}
          onClose={() => setManualName(null)}
          onSaved={(food) => {
            setManualName(null);
            setQuery(food.name);
            pickFood(food);
          }}
        />
      )}
    </>
  );
}

interface Props {
  day: Day;
  plan: Plan;
  meals: MealView[];
  target: EditorTarget;
  onClose: () => void;
  onSaveImprovised: (mealId: MealId, items: LoggedItem[]) => void;
  onSaveSwap: (mealId: MealId, swap: Swap) => void;
  onRevertSwap: (mealId: MealId, itemId: number) => void;
}

export function MealEditor({ day, plan, meals, target, onClose, onSaveImprovised, onSaveSwap, onRevertSwap }: Props) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>(target.tab);
  const [mealId, setMealId] = useState<MealId>(target.mealId ?? 'almoco');
  const [swapTarget, setSwapTarget] = useState(target.tab === 'trocar' && target.mealId ? { mealId: target.mealId, itemKey: target.itemKey! } : null);
  const builder = useBuilder(day.meals[mealId].improvised);

  const item = swapTarget && meals.find((m) => m.id === swapTarget.mealId)?.items.find((i) => i.key === swapTarget.itemKey);
  const tabs = [
    { id: 'improvisada' as const, label: isMobile ? 'Improvisada' : 'Refeição improvisada' },
    { id: 'trocar' as const, label: 'Trocar alimento' },
  ];

  return (
    <Modal
      eyebrow={isMobile ? `${weekdayShort(day.date)}, ${dateShort(day.date)}` : `${weekday(day.date)}, ${dateLong(day.date)}`}
      title={tab === 'improvisada' ? 'Refeição improvisada' : 'Trocar alimento'}
      onClose={onClose}
      header={<Segmented label="Modo" value={tab} onChange={setTab} options={isMobile ? [...tabs].reverse() : tabs} />}
    >
      {tab === 'improvisada' ? (
        <ImprovisedTab day={day} plan={plan} meals={meals} builder={builder} mealId={mealId} onMeal={setMealId} onClose={onClose} onSave={() => onSaveImprovised(mealId, builder.items)} />
      ) : (
        <SwapTab
          plan={plan}
          meals={meals}
          target={swapTarget && item ? { mealId: swapTarget.mealId, item } : null}
          onPick={(id, itemKey) => setSwapTarget({ mealId: id, itemKey })}
          onSave={onSaveSwap}
          onRevert={onRevertSwap}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
