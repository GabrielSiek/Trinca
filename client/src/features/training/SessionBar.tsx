import styled from 'styled-components';
import type { ActiveSession, Workout } from '../../../../shared/types.ts';
import { CheckIcon } from '../../components/icons.tsx';
import { BigNumber, Button, Eyebrow, Mono } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { clock } from '../../lib/format.ts';
import { doneCount, seriesCount, type PendingSet } from '../../lib/training.ts';
import { c, mobile } from '../../theme.ts';

const Outer = styled.div`
  padding: 12px clamp(16px, 4vw, 48px) 20px;
  background: ${c.bg};
  border-top: 1px solid ${c.line};
  ${mobile} {
    padding: 0;
    border-top: 0;
  }
`;

const Region = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
  padding: 16px 20px;
  background: ${c.barBg};
  border: 1px solid ${c.limeRing};
  border-radius: 20px;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
  ${mobile} {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 10px;
    padding: 14px 16px;
    border-width: 1px 0 0;
    border-radius: 0;
    box-shadow: none;
  }
`;

const Grow = styled.div`
  flex: 1 1 420px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Between = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const NowName = styled.span<{ $size: number; $mobile?: number }>`
  min-width: 0;
  font-size: ${(p) => p.$size}px;
  font-weight: 700;
  font-stretch: 85%;
  ${mobile} {
    font-size: ${(p) => p.$mobile ?? p.$size}px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Timer = styled.div`
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 180px;
`;

const Progress = styled.div`
  height: 6px;
  background: ${c.line};
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${c.lime};
  border-radius: 999px;
`;

const BigAction = styled(Button)`
  min-height: 60px;
  padding: 0 28px;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 800;
  gap: 12px;
  ${mobile} {
    min-height: 58px;
  }
`;

const RestButton = styled(Button)`
  min-height: 56px;
  border-radius: 14px;
  ${mobile} {
    min-height: 52px;
    padding: 0 14px;
  }
`;

interface Props {
  workout: Workout;
  session: ActiveSession;
  pending: PendingSet | null;
  resting: boolean;
  restLeft: number;
  onFinishSet: () => void;
  onAddRest: () => void;
  onSkipRest: () => void;
  onFinishWorkout: () => void;
}

export function SessionBar({ workout, session, pending, resting, restLeft, onFinishSet, onAddRest, onSkipRest, onFinishWorkout }: Props) {
  const isMobile = useIsMobile();
  const overall = `${doneCount(workout, session)} de ${seriesCount(workout)} séries`;
  const setText = pending ? `Série ${pending.index + 1} de ${pending.exercise.sets.length}` : '';
  const load = pending ? `${pending.set.load || '—'} kg × ${pending.set.reps || '—'}${isMobile ? '' : ' reps'}` : '';
  const restPct = session.restTotal ? `${Math.max(0, Math.min(100, (restLeft / session.restTotal) * 100)).toFixed(1)}%` : '0%';
  const finishIcon = <CheckIcon size={22} />;

  if (!pending) {
    return (
      <Outer>
        <Region role="region" aria-label="Treino concluído">
          {isMobile ? (
            <>
              <Eyebrow $size={10} $color={c.lime} style={{ letterSpacing: '0.06em' }}>Todas as séries feitas · {overall}</Eyebrow>
              <BigAction $variant="primary" onClick={onFinishWorkout}>Finalizar treino {workout.letter}</BigAction>
            </>
          ) : (
            <>
              <Grow>
                <Eyebrow $size={11} $color={c.lime}>Todas as séries feitas</Eyebrow>
                <NowName $size={24}>Treino {workout.letter} concluído · {overall}</NowName>
              </Grow>
              <BigAction $variant="primary" onClick={onFinishWorkout}>Finalizar treino</BigAction>
            </>
          )}
        </Region>
      </Outer>
    );
  }

  if (resting) {
    return (
      <Outer>
        <Region role="region" aria-label="Descanso">
          {isMobile ? (
            <>
              <Eyebrow $size={10} style={{ letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>A seguir · {setText} · {pending.exercise.name}</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Eyebrow $size={10}>Descanso</Eyebrow>
                  <BigNumber $size={52} $color={c.lime}>{clock(restLeft)}</BigNumber>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <RestButton $variant="neutral" onClick={onAddRest}>+30 s</RestButton>
                  <RestButton $variant="light" onClick={onSkipRest}>Pular</RestButton>
                </div>
              </div>
              <Progress><ProgressFill style={{ width: restPct }} /></Progress>
              <Mono $color={c.text}>Próxima: {load}</Mono>
            </>
          ) : (
            <>
              <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 22 }}>
                <Timer>
                  <Eyebrow $size={11}>Descanso</Eyebrow>
                  <BigNumber $size={64} $color={c.lime}>{clock(restLeft)}</BigNumber>
                  <Progress><ProgressFill style={{ width: restPct }} /></Progress>
                </Timer>
                <Grow style={{ flex: '0 1 auto' }}>
                  <Eyebrow $size={11}>A seguir · {setText}</Eyebrow>
                  <NowName $size={20}>{pending.exercise.name}</NowName>
                  <Mono $size={13} $color={c.text}>{load}</Mono>
                </Grow>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <RestButton $variant="neutral" onClick={onAddRest}>+30 s</RestButton>
                <RestButton $variant="light" onClick={onSkipRest}>Pular descanso</RestButton>
              </div>
            </>
          )}
        </Region>
      </Outer>
    );
  }

  return (
    <Outer>
      <Region role="region" aria-label="Série em andamento">
        {isMobile ? (
          <>
            <Between>
              <Eyebrow $size={10} $color={c.lime} style={{ letterSpacing: '0.06em' }}>Agora · {setText}</Eyebrow>
              <Mono $size={10}>{overall}</Mono>
            </Between>
            <Between>
              <NowName $size={19}>{pending.exercise.name}</NowName>
              <Mono $size={13} $color={c.text} style={{ flex: 'none' }}>{load}</Mono>
            </Between>
            <BigAction $variant="primary" onClick={onFinishSet}>{finishIcon}Encerrar série</BigAction>
            <Mono $size={11} style={{ textAlign: 'center' }}>Ao encerrar, começa o descanso de {clock(pending.exercise.rest)}</Mono>
          </>
        ) : (
          <>
            <Grow>
              <Eyebrow $size={11} $color={c.lime}>Agora · {setText} · {overall}</Eyebrow>
              <NowName $size={24}>{pending.exercise.name}</NowName>
              <Mono $size={13} $color={c.text}>{load}</Mono>
            </Grow>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <BigAction $variant="primary" onClick={onFinishSet}>{finishIcon}Encerrar série</BigAction>
              <Mono $size={11}>depois: descanso de {clock(pending.exercise.rest)}</Mono>
            </div>
          </>
        )}
      </Region>
    </Outer>
  );
}
