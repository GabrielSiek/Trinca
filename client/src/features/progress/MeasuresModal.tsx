import { useState } from 'react';
import styled from 'styled-components';
import type { Measure } from '../../../../shared/types.ts';
import { Modal, ModalBody, ModalFooter } from '../../components/Modal.tsx';
import { BareInput, Button, FieldBox, Label, Mono, Muted } from '../../components/ui.tsx';
import { dateLong, weekday } from '../../lib/dates.ts';
import { decimalInput, parseDecimal } from '../../lib/format.ts';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const FIELDS = [
  { key: 'belly', label: 'Barriga' },
  { key: 'navel', label: 'Umbigo' },
  { key: 'arm', label: 'Braço' },
] as const;

type Key = (typeof FIELDS)[number]['key'];

interface Props {
  date: string;
  existing: Measure | null;
  previous: Measure | null;
  onClose: () => void;
  onSave: (values: Record<Key, number | null>) => void;
}

export function MeasuresModal({ date, existing, previous, onClose, onSave }: Props) {
  const [values, setValues] = useState<Record<Key, string>>({
    belly: decimalInput(existing?.belly ?? null),
    navel: decimalInput(existing?.navel ?? null),
    arm: decimalInput(existing?.arm ?? null),
  });

  const parsed = { belly: parseDecimal(values.belly), navel: parseDecimal(values.navel), arm: parseDecimal(values.arm) };
  const hasAny = Object.values(parsed).some((v) => v !== null);

  return (
    <Modal eyebrow={`${weekday(date)}, ${dateLong(date)}`} title="Registrar medidas" width={520} onClose={onClose}>
      <ModalBody>
        <Grid>
          {FIELDS.map(({ key, label }) => (
            <Field key={key}>
              <Label htmlFor={`medida-${key}`}>{label}</Label>
              <FieldBox $height={52}>
                <BareInput
                  id={`medida-${key}`}
                  inputMode="decimal"
                  value={values[key]}
                  placeholder={decimalInput(previous?.[key] ?? null)}
                  $mono
                  $size={15}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value.replace(/[^0-9,.]/g, '') })}
                />
                <Mono>cm</Mono>
              </FieldBox>
            </Field>
          ))}
        </Grid>
        <Muted>Meça sempre no mesmo dia da semana, em jejum. Os números apagados são a última medição.</Muted>
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Cancelar</Button>
        <Button $variant="primary" $height={48} disabled={!hasAny} onClick={() => onSave(parsed)}>Salvar medidas</Button>
      </ModalFooter>
    </Modal>
  );
}
