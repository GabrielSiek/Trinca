import { useState } from 'react';
import styled from 'styled-components';
import type { Food, FoodUnit } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { Modal, ModalBody, ModalFooter } from '../../components/Modal.tsx';
import { toastError } from '../../components/Toast.tsx';
import { BareInput, Button, FieldBox, Label, Mono, Muted, Segmented } from '../../components/ui.tsx';
import { parseDecimal } from '../../lib/format.ts';
import { c } from '../../theme.ts';

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

const NUTRIENTS = [
  { key: 'kcal', label: 'Calorias', unit: 'kcal', max: 950 },
  { key: 'p', label: 'Proteína', unit: 'g', max: 100 },
  { key: 'c', label: 'Carboidrato', unit: 'g', max: 100 },
  { key: 'g', label: 'Gordura', unit: 'g', max: 100 },
] as const;

type NutrientKey = (typeof NUTRIENTS)[number]['key'];

export function FoodFormModal({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (food: Food) => void }) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState<FoodUnit>('g');
  const [values, setValues] = useState<Record<NutrientKey, string>>({ kcal: '', p: '', c: '', g: '' });
  const [saving, setSaving] = useState(false);

  const parsed = NUTRIENTS.map((n) => ({ ...n, value: parseDecimal(values[n.key]) ?? 0 }));
  const kcalOk = parseDecimal(values.kcal) !== null;
  const valid = !!name.trim() && kcalOk && parsed.every((n) => n.value >= 0 && n.value <= n.max);

  const save = async () => {
    setSaving(true);
    try {
      const [kcal, p, carbs, g] = parsed.map((n) => n.value);
      onSaved(await api.saveFood({ name: name.trim(), brand: null, source: 'Rótulo', unit, kcal, p, c: carbs, g }));
    } catch (err) {
      toastError(err);
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow="Valores do rótulo" title="Novo alimento" width={520} onClose={onClose}>
      <ModalBody>
        <Field>
          <Label htmlFor="alimento-nome">Nome</Label>
          <FieldBox $height={52}>
            <BareInput id="alimento-nome" value={name} onChange={(e) => setName(e.target.value)} />
          </FieldBox>
        </Field>
        <Field>
          <Label as="span">Valores por 100</Label>
          <Segmented label="Unidade" value={unit} onChange={setUnit} options={[{ id: 'g', label: 'Gramas (g)' }, { id: 'ml', label: 'Mililitros (ml)' }]} />
        </Field>
        <Grid>
          {NUTRIENTS.map((n) => (
            <Field key={n.key}>
              <Label htmlFor={`alimento-${n.key}`}>{n.label}</Label>
              <FieldBox>
                <BareInput
                  id={`alimento-${n.key}`}
                  inputMode="decimal"
                  value={values[n.key]}
                  $mono
                  $size={15}
                  onChange={(e) => setValues({ ...values, [n.key]: e.target.value.replace(/[^0-9,.]/g, '') })}
                />
                <Mono style={{ color: c.muted }}>{n.unit}</Mono>
              </FieldBox>
            </Field>
          ))}
        </Grid>
        <Muted>Rótulos costumam trazer os valores por porção. Se for o caso, converta para 100 {unit} antes de salvar.</Muted>
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Cancelar</Button>
        <Button $variant="primary" $height={48} disabled={!valid || saving} onClick={() => void save()}>Salvar alimento</Button>
      </ModalFooter>
    </Modal>
  );
}
