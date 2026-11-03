import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { Exercise, TrainingState, Workout, WorkoutSet } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { AppShell } from '../../components/AppShell.tsx';
import { ChevronRightIcon, PlusIcon, TrashIcon } from '../../components/icons.tsx';
import { ConfirmModal } from '../../components/Modal.tsx';
import { toast, toastError } from '../../components/Toast.tsx';
import { Button, CenteredState, CommitInput, Eyebrow, IconButton, Mono, Muted, PageTitle } from '../../components/ui.tsx';
import { useIsMobile, useNow } from '../../hooks.ts';
import { ddmm, todayISO } from '../../lib/dates.ts';
import { doneCount, pendingSet, seriesCount } from '../../lib/training.ts';
import { c, mobile } from '../../theme.ts';
import { EditExerciseModal, FinishModal } from './modals.tsx';
import { ExerciseCard } from './ExerciseCard.tsx';
import { ExerciseSearch } from './ExerciseSearch.tsx';
import { SessionBar } from './SessionBar.tsx';

const TopStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`;

const Dash = styled.span`
  width: 20px;
  height: 4px;
  border-radius: 999px;
  background: ${c.lime};
  ${mobile} {
    width: 16px;
    height: 3px;
  }
`;

const Intro = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 32px;
  ${mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
`;

const Rotation = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const RotationChain = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RotationLetter = styled.span<{ $turn: boolean; $next: boolean }>`
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 20px;
  font-weight: 800;
  font-stretch: 68%;
  background: ${(p) => (p.$turn ? c.lime : 'transparent')};
  color: ${(p) => (p.$turn ? c.onLime : p.$next ? c.orange : c.text)};
  border: 1px solid ${(p) => (p.$turn ? c.lime : p.$next ? c.orange : c.lineStrong)};
`;

const Columns = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  ${mobile} {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 16px;
  }
`;

const WorkoutList = styled.aside`
  flex: 1 1 290px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  ${mobile} {
    flex: none;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    margin: 0 -16px;
    padding: 2px 16px 6px;
  }
`;

const WorkoutTile = styled.button.attrs({ type: 'button' })<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 76px;
  padding: 12px 16px;
  text-align: left;
  border-radius: 16px;
  cursor: pointer;
  background: ${(p) => (p.$on ? c.limeTint : c.surface)};
  border: 1.5px solid ${(p) => (p.$on ? c.lime : c.line)};
  color: ${c.text};
  ${mobile} {
    flex: none;
    width: 128px;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px;
    border-radius: 14px;
  }
`;

const Letter = styled.span<{ $color: string }>`
  flex: none;
  width: 40px;
  font-size: 48px;
  font-weight: 800;
  font-stretch: 62%;
  line-height: 0.9;
  text-align: center;
  color: ${(p) => p.$color};
  ${mobile} {
    width: auto;
    font-size: 40px;
    line-height: 0.85;
  }
`;

const TileText = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TileName = styled.span`
  font-size: 17px;
  font-weight: 700;
  ${mobile} {
    font-size: 14px;
    line-height: 1.2;
  }
`;

const TileTop = styled.span`
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
`;

const NewWorkout = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 60px;
  border-radius: 16px;
  cursor: pointer;
  background: transparent;
  border: 1.5px dashed ${c.dash};
  color: ${c.lime};
  font-weight: 600;
  ${mobile} {
    flex: none;
    width: 96px;
    flex-direction: column;
    gap: 6px;
    border-radius: 14px;
    font-size: 13px;
  }
`;

const Selected = styled.section`
  flex: 999 1 640px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  ${mobile} {
    flex: none;
    gap: 12px;
  }
`;

const SummaryCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  background: ${c.surface};
  border: 1px solid ${c.line};
  border-radius: 18px;
  padding: 22px 24px;
  ${mobile} {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 14px;
    padding: 16px;
  }
`;

const SummaryMain = styled.div`
  flex: 1 1 360px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18px;
  ${mobile} {
    flex: none;
    gap: 12px;
  }
`;

const HugeLetter = styled.span`
  flex: none;
  font-size: 88px;
  font-weight: 800;
  font-stretch: 62%;
  line-height: 0.8;
  color: ${c.lime};
  ${mobile} {
    font-size: 72px;
  }
`;

const NameField = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${mobile} {
    gap: 2px;
  }
`;

const NameInput = styled(CommitInput)`
  height: 46px;
  padding: 0 12px;
  margin-left: -12px;
  width: calc(100% + 12px);
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 34px;
  font-weight: 800;
  font-stretch: 68%;
  text-transform: uppercase;
  &:focus {
    border-color: ${c.lineStrong};
    background: ${c.field};
  }
  ${mobile} {
    height: 44px;
    padding: 0 8px;
    margin-left: -8px;
    width: calc(100% + 8px);
    font-size: 26px;
  }
`;

const EmptyNote = styled.p`
  padding: 28px;
  color: ${c.muted};
  text-align: center;
  background: ${c.surface};
  border: 1px dashed ${c.lineStrong};
  border-radius: 18px;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

interface StatusParts {
  text: string;
  color: string;
}

function workoutStatus(w: Workout, s: TrainingState, isMobile: boolean): StatusParts {
  if (w.id === s.currentId) {
    const text = s.active ? (isMobile ? 'agora' : 'em andamento') : s.doneToday ? (isMobile ? 'feito' : 'feito hoje') : 'hoje';
    return { text, color: c.lime };
  }
  if (w.id === s.nextId) return { text: 'próximo', color: c.orange };
  if (!w.lastDate) return { text: 'novo', color: c.muted };
  return { text: isMobile ? ddmm(w.lastDate) : `último ${ddmm(w.lastDate)}`, color: c.muted };
}

export function TrainingPage() {
  const isMobile = useIsMobile();
  const [today] = useState(todayISO);
  const [state, setState] = useState<TrainingState | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [exerciseToRemove, setExerciseToRemove] = useState<Exercise | null>(null);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [finishing, setFinishing] = useState(false);

  const run = useCallback(async (request: Promise<TrainingState>) => {
    try {
      const next = await request;
      setState(next);
      return next;
    } catch (err) {
      toastError(err);
      return null;
    }
  }, []);

  useEffect(() => {
    void run(api.training(today));
  }, [run, today]);

  const session = state?.active ?? null;
  const now = useNow(!!session?.restEnd && session.restEnd > Date.now());

  if (!state) {
    return <AppShell><CenteredState>Carregando…</CenteredState></AppShell>;
  }

  const { workouts } = state;
  const selected = workouts.find((w) => w.id === selectedId) ?? workouts.find((w) => w.id === state.currentId) ?? workouts[0];
  const sessionWorkout = session ? workouts.find((w) => w.id === session.workoutId) ?? null : null;
  const current = workouts.find((w) => w.id === state.currentId);
  const next = workouts.find((w) => w.id === state.nextId);
  const inSession = !!session && selected?.id === session.workoutId;
  const pending = session && sessionWorkout ? pendingSet(sessionWorkout, session) : null;
  const restLeft = session?.restEnd ? (session.restEnd - now) / 1000 : 0;
  const resting = restLeft > 0 && !!pending;

  const metaOf = (w: Workout) => `${w.exercises.length} ${isMobile ? 'exerc.' : 'exercícios'} · ${seriesCount(w)} séries`;

  const createWorkout = async () => {
    const result = await run(api.createWorkout(today));
    if (result) {
      setSelectedId(result.workouts[result.workouts.length - 1].id);
      setSearching(true);
    }
  };

  const toggleSet = (set: WorkoutSet) => {
    if (!inSession || !session) {
      toast('Comece o treino para marcar as séries');
      return;
    }
    void run(api.patchSession(today, session.id, { set: { id: set.id, done: !session.doneSetIds.includes(set.id) } }));
  };

  const finishSet = () => {
    if (!session || !sessionWorkout || !pending) return;
    const doneNow = { ...session, doneSetIds: [...session.doneSetIds, pending.set.id] };
    const more = pendingSet(sessionWorkout, doneNow);
    const { rest } = pending.exercise;
    void run(api.patchSession(today, session.id, {
      set: { id: pending.set.id, done: true },
      rest: more && rest > 0 ? { end: Date.now() + rest * 1000, total: rest } : null,
    }));
  };

  const action = !session
    ? { label: isMobile && selected ? `Começar treino ${selected.letter}` : 'Começar treino', variant: 'primary' as const, onClick: () => selected && void run(api.startSession(today, selected.id)) }
    : inSession
      ? { label: 'Encerrar treino', variant: 'quiet' as const, onClick: () => setFinishing(true) }
      : { label: `Voltar ao treino ${sessionWorkout?.letter ?? ''}`, variant: 'outline' as const, onClick: () => setSelectedId(session.workoutId) };

  const topText = session
    ? `${isMobile ? '' : 'Treino '}${sessionWorkout?.letter ?? ''} em andamento`
    : state.doneToday
      ? `${isMobile ? '' : 'Treino '}${current?.letter ?? ''} feito hoje`
      : isMobile ? 'sem treino hoje' : 'Nenhum treino hoje';

  const dock = session && sessionWorkout && (
    <SessionBar
      workout={sessionWorkout}
      session={session}
      pending={pending}
      resting={resting}
      restLeft={restLeft}
      onFinishSet={finishSet}
      onAddRest={() => {
        if (session.restEnd && session.restTotal) void run(api.patchSession(today, session.id, { rest: { end: session.restEnd + 30000, total: session.restTotal + 30 } }));
      }}
      onSkipRest={() => void run(api.patchSession(today, session.id, { rest: null }))}
      onFinishWorkout={() => void run(api.finishSession(today, session.id))}
    />
  );

  const removeWorkout = async (workout: Workout) => {
    setWorkoutToDelete(null);
    await run(api.deleteWorkout(today, workout.id));
    setSelectedId(null);
  };

  return (
    <AppShell
      dock={dock}
      right={
        <TopStatus>
          <Dash />
          <Mono $mobileSize={11}>{topText}</Mono>
        </TopStatus>
      }
    >
      <Intro>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8 }}>
          <PageTitle>Treino</PageTitle>
          {isMobile ? (
            <Mono>
              Rotação {workouts.map((w) => w.letter).join(' → ')}
              {next && <> · <span style={{ color: c.orange }}>próximo {next.letter}</span></>}
            </Mono>
          ) : (
            <Muted $size={14}>Cada série tem sua própria carga e repetições. A ordem dos treinos define qual vem depois.</Muted>
          )}
        </div>
        {!isMobile && (
          <Rotation>
            <Eyebrow>Ordem da rotação</Eyebrow>
            <RotationChain>
              {workouts.map((w, i) => (
                <span key={w.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RotationLetter $turn={w.id === state.currentId} $next={w.id === state.nextId}>{w.letter}</RotationLetter>
                  {i < workouts.length - 1 && <span style={{ display: 'flex', color: c.dash }}><ChevronRightIcon size={14} width={2.4} /></span>}
                </span>
              ))}
            </RotationChain>
            {next && <Mono $color={c.orange}>Próximo: Treino {next.letter} · {next.name}</Mono>}
          </Rotation>
        )}
      </Intro>

      <Columns>
        <WorkoutList aria-label="Seus treinos">
          {!isMobile && <Eyebrow as="h2" style={{ margin: '0 0 4px', fontWeight: 500 }}>Seus treinos · {workouts.length}</Eyebrow>}
          {workouts.map((w) => {
            const on = w.id === selected?.id;
            const status = workoutStatus(w, state, isMobile);
            const letterColor = on || w.id === state.currentId ? c.lime : c.text;
            return (
              <WorkoutTile key={w.id} $on={on} aria-pressed={on} onClick={() => setSelectedId(w.id)}>
                {isMobile ? (
                  <>
                    <TileTop>
                      <Letter $color={letterColor}>{w.letter}</Letter>
                      <Mono $size={10} $color={status.color}>{status.text}</Mono>
                    </TileTop>
                    <TileName>{w.name || 'Sem nome'}</TileName>
                    <Mono $size={10}>{metaOf(w)}</Mono>
                  </>
                ) : (
                  <>
                    <Letter $color={letterColor}>{w.letter}</Letter>
                    <TileText>
                      <TileName>{w.name || 'Sem nome'}</TileName>
                      <Mono>{metaOf(w)}</Mono>
                    </TileText>
                    <Mono $size={11} $color={status.color} style={{ flex: 'none' }}>{status.text}</Mono>
                  </>
                )}
              </WorkoutTile>
            );
          })}
          <NewWorkout onClick={() => void createWorkout()}>
            <PlusIcon size={20} />
            <span style={{ color: c.text }}>Novo treino</span>
          </NewWorkout>
        </WorkoutList>

        {selected ? (
          <Selected aria-label="Treino selecionado">
            <SummaryCard>
              <SummaryMain>
                <HugeLetter aria-hidden="true">{selected.letter}</HugeLetter>
                <NameField>
                  <Eyebrow as="label" htmlFor="nome-treino" $mobileSize={10}>Treino {selected.letter}</Eyebrow>
                  <NameInput
                    id="nome-treino"
                    key={selected.id}
                    value={selected.name}
                    maxLength={60}
                    onCommit={(name) => {
                      if (name.trim()) void run(api.renameWorkout(today, selected.id, name));
                    }}
                  />
                  <Mono $mobileSize={11}>
                    {metaOf(selected)}
                    {inSession ? ` · ${doneCount(selected, session)} feitas` : selected.lastDate ? ` · último: ${ddmm(selected.lastDate)}` : ''}
                  </Mono>
                </NameField>
              </SummaryMain>
              <Actions>
                {!isMobile && (
                  <IconButton
                    aria-label={`Excluir treino ${selected.letter}`}
                    style={{ width: 48, height: 48, background: 'transparent', borderColor: c.lineStrong }}
                    $color={c.muted}
                    onClick={() => (inSession ? toast('Encerre o treino em andamento antes de excluí-lo') : setWorkoutToDelete(selected))}
                  >
                    <TrashIcon />
                  </IconButton>
                )}
                <Button $variant={action.variant} $height={isMobile ? 50 : 48} $block={isMobile} disabled={!session && seriesCount(selected) === 0} style={isMobile ? undefined : { padding: '0 22px' }} onClick={action.onClick}>
                  {action.label}
                </Button>
              </Actions>
            </SummaryCard>

            {selected.exercises.length === 0 && <EmptyNote>Nenhum exercício ainda. Adicione o primeiro abaixo.</EmptyNote>}

            {selected.exercises.map((exercise, i) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                order={i + 1}
                session={inSession ? session : null}
                currentSetId={inSession ? pending?.set.id ?? null : null}
                resting={resting}
                onEdit={() => setEditing(exercise)}
                onRemove={() => setExerciseToRemove(exercise)}
                onAddSet={() => void run(api.addSet(today, exercise.id))}
                onRemoveSet={(id) => void run(api.deleteSet(today, id))}
                onChangeSet={(id, load, reps) => void run(api.patchSet(today, id, load, reps))}
                onToggleSet={toggleSet}
              />
            ))}

            <Button $variant="outline" $height={isMobile ? 50 : 48} aria-expanded={searching} onClick={() => setSearching(!searching)} style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
              <PlusIcon />
              {searching ? 'Fechar busca' : 'Adicionar exercício'}
            </Button>
            {searching && (
              <ExerciseSearch
                library={state.library}
                workout={selected}
                onAdd={(name, muscle) => void run(api.addExercise(today, selected.id, name, muscle))}
              />
            )}

            {isMobile && (
              <Button $variant="quiet" onClick={() => (inSession ? toast('Encerre o treino em andamento antes de excluí-lo') : setWorkoutToDelete(selected))} style={{ alignSelf: 'stretch', color: c.muted }}>
                <TrashIcon />
                Excluir treino {selected.letter}
              </Button>
            )}
          </Selected>
        ) : (
          <Selected>
            <EmptyNote>Nenhum treino cadastrado. Crie o primeiro em “Novo treino”.</EmptyNote>
          </Selected>
        )}
      </Columns>

      {editing && (
        <EditExerciseModal
          exercise={editing}
          onClose={() => setEditing(null)}
          onSave={(change) => {
            setEditing(null);
            void run(api.patchExercise(today, editing.id, change));
          }}
        />
      )}

      {exerciseToRemove && (
        <ConfirmModal
          title="Remover exercício"
          text={`"${exerciseToRemove.name}" sai deste treino, junto com as ${exerciseToRemove.sets.length} séries dele.`}
          confirmLabel="Remover"
          danger
          onConfirm={() => {
            void run(api.deleteExercise(today, exerciseToRemove.id));
            setExerciseToRemove(null);
          }}
          onClose={() => setExerciseToRemove(null)}
        />
      )}

      {workoutToDelete && (
        <ConfirmModal
          title={`Excluir treino ${workoutToDelete.letter}`}
          text={`"${workoutToDelete.name}" sai da rotação com todos os exercícios. Os dias já registrados como treinados continuam contando.`}
          confirmLabel="Excluir treino"
          danger
          onConfirm={() => void removeWorkout(workoutToDelete)}
          onClose={() => setWorkoutToDelete(null)}
        />
      )}

      {finishing && session && sessionWorkout && (
        <FinishModal
          workout={sessionWorkout}
          done={doneCount(sessionWorkout, session)}
          total={seriesCount(sessionWorkout)}
          onClose={() => setFinishing(false)}
          onSave={() => {
            setFinishing(false);
            void run(api.finishSession(today, session.id));
          }}
          onDiscard={() => {
            setFinishing(false);
            void run(api.discardSession(today, session.id));
          }}
        />
      )}
    </AppShell>
  );
}
