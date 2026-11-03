import styled from 'styled-components';
import type { ActiveSession, Exercise, WorkoutSet } from '../../../../shared/types.ts';
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon } from '../../components/icons.tsx';
import { Button, Check, CommitInput, Eyebrow, FieldBox, IconButton, Mono } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { clock } from '../../lib/format.ts';
import { c, mobile, mono } from '../../theme.ts';

const DESKTOP_COLUMNS = '64px 116px 140px 116px minmax(0, 1fr) 44px 44px';
const MOBILE_COLUMNS = '26px 64px minmax(0, 1fr) minmax(0, 1fr) 44px';

const Article = styled.article<{ $current: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: ${c.surface};
  border: 1px solid ${(p) => (p.$current ? c.limeRing : c.line)};
  border-radius: 18px;
  padding: 18px 20px;
  ${mobile} {
    gap: 8px;
    padding: 12px;
    border-radius: 16px;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  ${mobile} {
    gap: 8px;
  }
`;

const TitleButton = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: 0;
  color: ${c.text};
  text-align: left;
  cursor: pointer;
  &:hover h3 {
    color: ${c.lime};
  }
  ${mobile} {
    gap: 10px;
    padding: 4px 0 0 2px;
  }
`;

const Title = styled.h3`
  font-size: 20px;
  font-weight: 700;
  font-stretch: 85%;
  ${mobile} {
    font-size: 17px;
    line-height: 1.25;
    font-stretch: 100%;
  }
`;

const TitleText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Grid = styled.div<{ $columns: string }>`
  display: grid;
  grid-template-columns: ${(p) => p.$columns};
  gap: 10px;
  align-items: center;
  padding: 0 10px;
  ${mobile} {
    gap: 6px;
    padding: 0 6px;
  }
`;

const HeadRow = styled(Grid)`
  ${mono}
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${c.muted};
  ${mobile} {
    font-size: 10px;
  }
`;

const SetRow = styled(Grid)<{ $current: boolean }>`
  min-height: 56px;
  border-radius: 12px;
  background: ${(p) => (p.$current ? c.limeRow : 'transparent')};
  border: 1.5px solid ${(p) => (p.$current ? c.lime : c.lineSoft)};
  ${mobile} {
    min-height: 54px;
  }
`;

const SetNumber = styled.span<{ $color: string }>`
  font-size: 22px;
  font-weight: 800;
  font-stretch: 68%;
  color: ${(p) => p.$color};
  ${mobile} {
    font-size: 20px;
  }
`;

const MobileInput = styled(CommitInput)`
  height: 44px;
  padding: 0 6px;
  background: ${c.field};
  border: 1px solid ${c.lineStrong};
  border-radius: 10px;
  text-align: center;
  ${mono}
  font-size: 16px;
  &:focus {
    border-color: ${c.lime};
  }
`;

const onlyDecimal = (value: string) => value.replace(/[^0-9,.]/g, '');
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, '');

interface Props {
  exercise: Exercise;
  order: number;
  session: ActiveSession | null;
  currentSetId: number | null;
  resting: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (id: number) => void;
  onChangeSet: (id: number, load: string, reps: string) => void;
  onToggleSet: (set: WorkoutSet) => void;
}

export function ExerciseCard({ exercise, order, session, currentSetId, resting, onEdit, onRemove, onAddSet, onRemoveSet, onChangeSet, onToggleSet }: Props) {
  const isMobile = useIsMobile();
  const isDone = (set: WorkoutSet) => !!session?.doneSetIds.includes(set.id);
  const done = exercise.sets.filter(isDone).length;
  const complete = done > 0 && done === exercise.sets.length;
  const hasCurrent = exercise.sets.some((s) => s.id === currentSetId);
  const progress = `${done}/${exercise.sets.length}`;
  const progressColor = complete ? c.lime : c.muted;
  const lastSet = exercise.sets[exercise.sets.length - 1];

  return (
    <Article $current={hasCurrent}>
      <Top>
        <TitleButton aria-label={`Editar ${exercise.name}`} onClick={onEdit}>
          <Mono $size={13} $mobileSize={12} style={{ flex: 'none' }}>{order}</Mono>
          <TitleText>
            <Title>{exercise.name}</Title>
            {isMobile ? (
              <Mono $size={11}>alvo {exercise.target} · descanso {clock(exercise.rest)} · <span style={{ color: progressColor }}>{progress} feitas</span></Mono>
            ) : (
              <Mono>{exercise.muscle} · alvo {exercise.target} reps · descanso {clock(exercise.rest)}</Mono>
            )}
          </TitleText>
        </TitleButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none', margin: isMobile ? '-4px -4px 0 0' : undefined }}>
          {!isMobile && <Mono $color={progressColor}>{progress}</Mono>}
          <IconButton $bare $color={c.muted} aria-label={`Remover ${exercise.name} do treino`} onClick={onRemove} style={{ borderRadius: 10 }}>
            <TrashIcon />
          </IconButton>
        </div>
      </Top>

      <HeadRow $columns={isMobile ? MOBILE_COLUMNS : DESKTOP_COLUMNS}>
        {isMobile ? (
          <>
            <span>Nº</span><span>Anterior</span><span style={{ textAlign: 'center' }}>Kg</span><span style={{ textAlign: 'center' }}>Reps</span><span style={{ textAlign: 'center' }}>Feita</span>
          </>
        ) : (
          <>
            <span>Série</span><span>Anterior</span><span>Carga</span><span>Reps</span><span /><span style={{ textAlign: 'center' }}>Feita</span><span />
          </>
        )}
      </HeadRow>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exercise.sets.map((set, i) => {
          const finished = isDone(set);
          const current = set.id === currentSetId;
          const n = i + 1;
          const numberColor = finished ? c.lime : current ? c.text : c.faint;
          const loadLabel = `Carga da série ${n} de ${exercise.name}, em kg`;
          const repsLabel = `Repetições da série ${n} de ${exercise.name}`;
          const check = <Check checked={finished} label={`Série ${n} de ${exercise.name} feita`} offColor={c.dash} onClick={() => onToggleSet(set)} />;
          const previous = <Mono $size={13} $mobileSize={11}>{set.previous ?? '—'}</Mono>;

          if (isMobile) {
            return (
              <SetRow key={set.id} $columns={MOBILE_COLUMNS} $current={current}>
                <SetNumber $color={numberColor}>{n}</SetNumber>
                {previous}
                <MobileInput aria-label={loadLabel} inputMode="decimal" value={set.load} filter={onlyDecimal} onCommit={(load) => onChangeSet(set.id, load, set.reps)} />
                <MobileInput aria-label={repsLabel} inputMode="numeric" value={set.reps} filter={onlyDigits} onCommit={(reps) => onChangeSet(set.id, set.load, reps)} />
                {check}
              </SetRow>
            );
          }

          return (
            <SetRow key={set.id} $columns={DESKTOP_COLUMNS} $current={current}>
              <SetNumber $color={numberColor}>{n}</SetNumber>
              {previous}
              <FieldBox $radius={10}>
                <CommitInput aria-label={loadLabel} inputMode="decimal" value={set.load} filter={onlyDecimal} $mono $size={15} $align="right" onCommit={(load) => onChangeSet(set.id, load, set.reps)} />
                <Mono>kg</Mono>
              </FieldBox>
              <FieldBox $radius={10}>
                <CommitInput aria-label={repsLabel} inputMode="numeric" value={set.reps} filter={onlyDigits} $mono $size={15} $align="right" onCommit={(reps) => onChangeSet(set.id, set.load, reps)} />
                <Mono>reps</Mono>
              </FieldBox>
              <Eyebrow $size={11} $color={c.lime} style={{ letterSpacing: '0.06em' }}>{current ? (resting ? 'próxima' : 'agora') : ''}</Eyebrow>
              {check}
              <IconButton $bare $color={c.faint} aria-label={`Remover série ${n} de ${exercise.name}`} onClick={() => onRemoveSet(set.id)} style={{ borderRadius: 10 }}>
                <CloseIcon size={16} width={2} />
              </IconButton>
            </SetRow>
          );
        })}
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Button $variant="ghost" onClick={onAddSet} style={{ padding: '0 10px', fontSize: 14 }}><PlusIcon size={16} width={2.4} />Série</Button>
          {lastSet && (
            <Button $variant="ghost" onClick={() => onRemoveSet(lastSet.id)} style={{ padding: '0 10px', fontSize: 14, color: c.muted }}><MinusIcon size={16} />Remover última</Button>
          )}
        </div>
      ) : (
        <Button $variant="ghost" onClick={onAddSet} style={{ alignSelf: 'flex-start' }}><PlusIcon size={16} width={2.4} />Adicionar série</Button>
      )}
    </Article>
  );
}
