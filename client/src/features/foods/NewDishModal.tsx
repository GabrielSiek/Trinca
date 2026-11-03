import { useState } from 'react';
import styled from 'styled-components';
import type { Dish, MealId } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { Modal, ModalBody, ModalFooter } from '../../components/Modal.tsx';
import { toastError } from '../../components/Toast.tsx';
import { BareInput, BigNumber, Button, Eyebrow, FieldBox, Label, Mono, Muted } from '../../components/ui.tsx';
import { dateShort, weekdayShort } from '../../lib/dates.ts';
import { fmt } from '../../lib/format.ts';
import { mealShort } from '../../lib/nutrition.ts';
import { usePlan } from '../../PlanContext.tsx';
import { c, mobile } from '../../theme.ts';
import { FoodBuilder, useBuilder } from './FoodBuilder.tsx';

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Totals = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 22px;
  background: ${c.bg};
  border: 1px solid ${c.line};
  border-radius: 16px;
  ${mobile} {
    padding: 16px;
    border-radius: 14px;
  }
`;

export function NewDishModal({ date, mealId, onClose, onCreated }: { date: string; mealId: MealId; onClose: () => void; onCreated: (dish: Dish) => void }) {
  const { reloadPlan } = usePlan();
  const builder = useBuilder(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const dish = await api.createDish(name.trim(), builder.items);
      await reloadPlan();
      onCreated(dish);
    } catch (err) {
      toastError(err);
      setSaving(false);
    }
  };

  const { total } = builder;
  const canSave = !!name.trim() && builder.items.length > 0 && !builder.unresolved && !saving;

  return (
    <Modal eyebrow={`${weekdayShort(date)}, ${dateShort(date)} · ${mealShort(mealId)}`} title="Novo prato" onClose={onClose}>
      <ModalBody>
        <Field>
          <Label htmlFor="prato-nome">Nome do prato</Label>
          <FieldBox $height={52}>
            <BareInput id="prato-nome" value={name} maxLength={80} placeholder="Ex.: Frango com purê" onChange={(e) => setName(e.target.value)} />
          </FieldBox>
        </Field>
        <FoodBuilder builder={builder} textLabel="O que vai no prato" placeholder="150 g de frango grelhado, 200 g de batata, salada com azeite" />
        <Totals>
          <Eyebrow>Total do prato</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <BigNumber $size={64} $mobile={52} $color={c.lime}>{fmt(total.kcal)}</BigNumber>
            <span style={{ fontSize: 18, color: c.muted }}>kcal</span>
          </div>
          <Mono $size={13} $color={c.text}>P {fmt(total.p)} g · C {fmt(total.c)} g · G {fmt(total.g)} g</Mono>
          {builder.unresolved > 0 && <Muted>Resolva ou remova os alimentos não encontrados para salvar.</Muted>}
        </Totals>
      </ModalBody>
      <ModalFooter>
        <Button $variant="quiet" $height={48} onClick={onClose}>Cancelar</Button>
        <Button $variant="primary" $height={48} disabled={!canSave} onClick={() => void save()}>Adicionar à lista</Button>
      </ModalFooter>
    </Modal>
  );
}
