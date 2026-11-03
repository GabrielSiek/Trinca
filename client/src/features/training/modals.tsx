import { useState } from 'react';
import styled from 'styled-components';
import type { Exercise, Workout } from '../../../../shared/types.ts';
import { Modal, ModalBody, ModalFooter } from '../../components/Modal.tsx';
import { BareInput, Button, FieldBox, Label, Mono, Muted } from '../../components/ui.tsx';

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
`;

interface ExerciseChange {
  name: string;
  muscle: string;
  target: string;
  rest: number;
}

export function EditExerciseModal({ exercise, onClose, onSave }: { exercise: Exercise; onClose: () => void; onSave: (change: ExerciseChange) => void }) {
  const [name, setName] = useState(exercise.name);
  const [muscle, setMuscle] = useState(exercise.muscle);
  const [target, setTarget] = useState(exercise.target);
  const [rest, setRest] = useState(String(exercise.rest));
  const valid = !!name.trim() && !!muscle.trim() && !!target.trim() && rest !== '';

  return (
    <Modal title="Editar exercício" width={520} onClose={onClose}>
      <ModalBody>
        <Field>
          <Label htmlFor="exercicio-nome">Nome</Label>
          <FieldBox $height={52}><BareInput id="exercicio-nome" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></FieldBox>
        </Field>
        <Field>
          <Label htmlFor="exercicio-grupo">Grupo muscular</Label>
          <FieldBox $height={52}><BareInput id="exercicio-grupo" value={muscle} maxLength={40} onChange={(e) => setMuscle(e.target.value)} /></FieldBox>
        </Field>
        <Grid>
          <Field>
            <Label htmlFor="exercicio-alvo">Repetições alvo</Label>
            <FieldBox $height={52}>
              <BareInput id="exercicio-alvo" value={target} maxLength={12} $mono $size={15} onChange={(e) => setTarget(e.target.value)} />
              <Mono>reps</Mono>
            </FieldBox>
          </Field>
          <Field>
            <Label htmlFor="exercicio-descanso">Descanso</Label>
            <FieldBox $height={52}>
              <BareInput id="exercicio-descanso" inputMode="numeric" value={rest} $mono $size={15} onChange={(e) => setRest(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
              <Mono>seg</Mono>
            </FieldBox>
          </Field>
        </Grid>
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Cancelar</Button>
        <Button $variant="primary" $height={48} disabled={!valid} onClick={() => onSave({ name: name.trim(), muscle: muscle.trim(), target: target.trim(), rest: Number(rest) })}>Salvar</Button>
      </ModalFooter>
    </Modal>
  );
}

interface FinishProps {
  workout: Workout;
  done: number;
  total: number;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export function FinishModal({ workout, done, total, onClose, onSave, onDiscard }: FinishProps) {
  return (
    <Modal title={`Encerrar treino ${workout.letter}`} width={500} onClose={onClose}>
      <ModalBody>
        <Muted $size={15}>
          Você fez {done} de {total} séries. Salvar conta como treino feito e passa para o próximo da rotação. Descartar apaga as séries marcadas.
        </Muted>
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Continuar treino</Button>
        <Button $variant="danger" $height={48} onClick={onDiscard}>Descartar</Button>
        <Button $variant="primary" $height={48} disabled={done === 0} onClick={onSave}>Salvar como feito</Button>
      </ModalFooter>
    </Modal>
  );
}
