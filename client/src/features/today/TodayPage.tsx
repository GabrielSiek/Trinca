import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import type { Dish, MealId, Swap } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { AppShell } from '../../components/AppShell.tsx';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../../components/icons.tsx';
import { ConfirmModal } from '../../components/Modal.tsx';
import { toastError } from '../../components/Toast.tsx';
import { Button, CenteredState, Eyebrow, Heading, IconButton, Mono } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { addDays, clampDate, dateLong, dateShort, todayISO, weekday } from '../../lib/dates.ts';
import { buildMeals, type ItemView } from '../../lib/nutrition.ts';
import { cycleInfo } from '../../lib/progress.ts';
import { usePlan } from '../../PlanContext.tsx';
import { mobile } from '../../theme.ts';
import { MealEditor, type EditorTarget } from '../foods/MealEditor.tsx';
import { NewDishModal } from '../foods/NewDishModal.tsx';
import { DayLogPanel } from './DayLogPanel.tsx';
import { GoalsPanel } from './GoalsPanel.tsx';
import { MealCard } from './MealCard.tsx';
import { useDay } from './useDay.ts';

const DateNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  ${mobile} {
    gap: 4px;
  }
`;

const DateLabel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 156px;
  line-height: 1.2;
  ${mobile} {
    min-width: 76px;
    line-height: 1.15;
  }
`;

const DateText = styled.span`
  font-size: 18px;
  font-weight: 700;
  ${mobile} {
    font-size: 16px;
  }
`;

const TopRow = styled.div`
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

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${mobile} {
    gap: 10px;
  }
`;

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  ${mobile} {
    flex-wrap: nowrap;
  }
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 14px;
  ${mobile} {
    flex-direction: column;
    gap: 0;
    line-height: 1.1;
  }
`;

export function TodayPage() {
  const { plan, setPlan } = usePlan();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { end } = cycleInfo(plan.cycle, todayISO());
  const [date, setDate] = useState(() => clampDate(todayISO(), plan.cycle.start, end));
  const { day, run } = useDay(date);

  const [picker, setPicker] = useState<MealId | null>(null);
  const [expanded, setExpanded] = useState<Partial<Record<MealId, boolean>>>({});
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [newDishFor, setNewDishFor] = useState<MealId | null>(null);
  const [dishToRemove, setDishToRemove] = useState<Dish | null>(null);
  const [mealToRestore, setMealToRestore] = useState<MealId | null>(null);

  const dateNav = (
    <DateNav>
      <IconButton aria-label="Dia anterior" disabled={date <= plan.cycle.start} onClick={() => setDate(addDays(date, -1))}>
        <ChevronLeftIcon size={isMobile ? 18 : 20} />
      </IconButton>
      <DateLabel>
        <Eyebrow $size={11} $mobileSize={10}>{weekday(date)}</Eyebrow>
        <DateText>{isMobile ? dateShort(date) : dateLong(date)}</DateText>
      </DateLabel>
      <IconButton aria-label="Próximo dia" disabled={date >= end} onClick={() => setDate(addDays(date, 1))}>
        <ChevronRightIcon size={isMobile ? 18 : 20} />
      </IconButton>
    </DateNav>
  );

  if (!day) {
    return (
      <AppShell right={dateNav}>
        <CenteredState>Carregando…</CenteredState>
      </AppShell>
    );
  }

  const meals = buildMeals(day, plan);
  const firstPending = meals.find((m) => !m.done)?.id;
  const marked = meals.filter((m) => m.done).length;
  const options = (selected: Dish) => plan.dishes.filter((d) => d.kind === 'option' && (!d.archived || d.id === selected.id));

  const toggleDone = (id: MealId) => {
    const done = !day.meals[id].done;
    void run(api.patchMeal(date, id, { done }), (d) => ({ ...d, meals: { ...d.meals, [id]: { ...d.meals[id], done } } }));
  };

  const pickDish = (id: MealId, dish: Dish) => {
    void run(api.patchMeal(date, id, { dishId: dish.id }), (d) => ({ ...d, meals: { ...d.meals, [id]: { ...d.meals[id], dishId: dish.id } } }));
  };

  const openItem = (mealId: MealId, item: ItemView) => {
    setEditor(item.dishItem ? { tab: 'trocar', mealId, itemKey: item.key } : { tab: 'improvisada', mealId });
  };

  const removeDish = async (dish: Dish) => {
    setDishToRemove(null);
    try {
      setPlan(await api.archiveDish(dish.id));
    } catch (err) {
      toastError(err);
    }
  };

  const saveSwap = (mealId: MealId, swap: Swap) => {
    setEditor(null);
    const { itemId, ...values } = swap;
    void run(api.saveSwap(date, mealId, itemId, values));
  };

  return (
    <AppShell right={dateNav}>
      <TopRow>
        <GoalsPanel day={day} plan={plan} meals={meals} />
        <DayLogPanel
          day={day}
          plan={plan}
          focusWeight={!!(location.state as { focusWeight?: boolean } | null)?.focusWeight}
          onWeight={(weight) => void run(api.patchDay(date, { weight }), (d) => ({ ...d, weight }))}
          onMusc={(musc) => void run(api.patchDay(date, { musc }), (d) => ({ ...d, musc }))}
          onActivity={(activity) => void run(api.patchDay(date, { activity }), (d) => ({ ...d, activity }))}
        />
      </TopRow>

      <Section aria-labelledby="refeicoes-titulo">
        <SectionHead>
          <SectionTitle>
            <Heading id="refeicoes-titulo" $size={34} $mobile={28}>Refeições</Heading>
            <Mono $mobileSize={11}>{marked} de 4 marcadas</Mono>
          </SectionTitle>
          <Button $variant="outline" onClick={() => setEditor({ tab: 'improvisada', mealId: firstPending })} style={{ flex: 'none', padding: isMobile ? '0 14px' : undefined }}>
            <PlusIcon size={isMobile ? 16 : 18} width={isMobile ? 2.4 : 2.2} />
            {isMobile ? 'Improvisada' : 'Refeição improvisada'}
          </Button>
        </SectionHead>

        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            options={options(meal.dish)}
            pickerOpen={picker === meal.id}
            expanded={expanded[meal.id] ?? meal.id === firstPending}
            onToggleDone={() => toggleDone(meal.id)}
            onToggleExpanded={() => setExpanded({ ...expanded, [meal.id]: !(expanded[meal.id] ?? meal.id === firstPending) })}
            onTogglePicker={() => setPicker(picker === meal.id ? null : meal.id)}
            onPickDish={(dish) => pickDish(meal.id, dish)}
            onNewDish={() => setNewDishFor(meal.id)}
            onRemoveDish={setDishToRemove}
            onItem={(item) => openItem(meal.id, item)}
            onBackToPlan={() => setMealToRestore(meal.id)}
          />
        ))}
      </Section>

      {editor && (
        <MealEditor
          day={day}
          plan={plan}
          meals={meals}
          target={editor}
          onClose={() => setEditor(null)}
          onSaveImprovised={(mealId, improvised) => {
            setEditor(null);
            void run(api.patchMeal(date, mealId, { improvised, done: true }));
          }}
          onSaveSwap={saveSwap}
          onRevertSwap={(mealId, itemId) => {
            setEditor(null);
            void run(api.revertSwap(date, mealId, itemId));
          }}
        />
      )}

      {newDishFor && (
        <NewDishModal
          date={date}
          mealId={newDishFor}
          onClose={() => setNewDishFor(null)}
          onCreated={(dish) => {
            pickDish(newDishFor, dish);
            setNewDishFor(null);
          }}
        />
      )}

      {dishToRemove && (
        <ConfirmModal
          title="Remover prato"
          text={`"${dishToRemove.short}" sai da lista de opções. Os dias em que você já comeu esse prato continuam registrados.`}
          confirmLabel="Remover"
          danger
          onConfirm={() => void removeDish(dishToRemove)}
          onClose={() => setDishToRemove(null)}
        />
      )}

      {mealToRestore && (
        <ConfirmModal
          title="Voltar ao plano"
          text="A refeição improvisada será apagada e o prato planejado volta a contar neste dia."
          confirmLabel="Voltar ao plano"
          onConfirm={() => {
            void run(api.patchMeal(date, mealToRestore, { improvised: null }));
            setMealToRestore(null);
          }}
          onClose={() => setMealToRestore(null)}
        />
      )}
    </AppShell>
  );
}
