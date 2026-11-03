import { useEffect, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import type { Food } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { PlusIcon, SearchIcon } from '../../components/icons.tsx';
import { BareInput, FieldBox, Mono, Muted, VisuallyHidden } from '../../components/ui.tsx';
import { fmt } from '../../lib/format.ts';
import { c, mobile } from '../../theme.ts';

const LOCAL_DELAY = 200;
// Open Food Facts allows few searches a minute, so wait until the typing has stopped.
const EXTERNAL_DELAY = 800;

const Results = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Result = styled.button.attrs({ type: 'button' })<{ $on: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  min-height: 60px;
  padding: 10px 16px;
  text-align: left;
  border-radius: 12px;
  cursor: pointer;
  background: ${(p) => (p.$on ? c.limeTint : c.tile)};
  border: 1.5px solid ${(p) => (p.$on ? c.lime : c.line)};
  color: ${c.text};
  ${mobile} {
    flex-wrap: nowrap;
    gap: 12px;
    padding: 8px 14px;
  }
`;

const ResultName = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-weight: 600;
`;

const Manual = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 14px;
  text-align: left;
  border-radius: 12px;
  cursor: pointer;
  background: transparent;
  border: 1.5px dashed ${c.dash};
  color: ${c.text};
`;

const DashedField = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  background: ${c.bg};
  border: 1px dashed ${c.lineStrong};
  border-radius: 12px;
  color: ${c.muted};
  &:focus-within {
    border-color: ${c.lime};
  }
`;

type Notice = 'searching' | 'limited' | 'failed' | null;

function useFoodSearch(query: string) {
  const [local, setLocal] = useState<Food[]>([]);
  const [external, setExternal] = useState<Food[]>([]);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    const q = query.trim();
    setExternal([]);
    setNotice(null);
    if (q.length < 2) {
      setLocal([]);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const localTimer = setTimeout(() => {
      api.searchFoods(q, signal).then(setLocal, () => {});
    }, LOCAL_DELAY);
    const externalTimer = setTimeout(() => {
      setNotice('searching');
      api.searchExternal(q, signal).then(
        (result) => {
          setExternal(result.foods);
          setNotice(result.limited ? 'limited' : result.failed ? 'failed' : null);
        },
        () => {
          if (!signal.aborted) setNotice('failed');
        },
      );
    }, EXTERNAL_DELAY);
    return () => {
      controller.abort();
      clearTimeout(localTimer);
      clearTimeout(externalTimer);
    };
  }, [query]);

  const known = new Set(local.map((food) => food.sourceRef));
  return { foods: [...local, ...external.filter((food) => !known.has(food.sourceRef))], notice };
}

const NOTICE_TEXT: Record<Exclude<Notice, null>, string> = {
  searching: 'Buscando no Open Food Facts…',
  limited: 'Limite de buscas do Open Food Facts por minuto. Tente de novo em instantes.',
  failed: 'Open Food Facts indisponível agora. A busca na TACO continua funcionando.',
};

export const foodKey = (food: Food) => `${food.source}:${food.sourceRef ?? food.id}`;

/** Foods from Open Food Facts are kept once picked, so the next search finds them offline. */
export async function rememberFood(food: Food) {
  try {
    const saved = food.id === null ? await api.saveFood(food) : food;
    if (saved.id !== null) await api.markFoodUsed(saved.id);
  } catch {
    // Only affects future search ranking; the meal itself is unaffected.
  }
}

interface Props {
  id: string;
  label: string;
  placeholder?: string;
  query: string;
  onQuery: (query: string) => void;
  onPick: (food: Food) => void;
  onManual: (name: string) => void;
  dashed?: boolean;
  selected?: string | null;
  /** Right side of a result, e.g. the amount that matches the calories. */
  trailing?: (food: Food) => ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function FoodSearch({ id, label, placeholder, query, onQuery, onPick, onManual, dashed, selected, trailing, inputRef }: Props) {
  const { foods, notice } = useFoodSearch(query);
  const q = query.trim();
  const Icon = dashed ? PlusIcon : SearchIcon;
  const field = (
    <>
      <span style={{ flex: 'none', display: 'flex', color: c.muted }}><Icon size={18} /></span>
      <VisuallyHidden as="label" htmlFor={id}>{label}</VisuallyHidden>
      <BareInput ref={inputRef} id={id} placeholder={placeholder} value={query} autoComplete="off" onChange={(e) => onQuery(e.target.value)} style={{ height: 44 }} $size={dashed ? 15 : 16} />
    </>
  );

  return (
    <Results>
      {dashed ? <DashedField>{field}</DashedField> : <FieldBox $height={52} style={{ gap: 10, padding: '0 16px' }}>{field}</FieldBox>}
      {foods.map((food) => {
        const key = foodKey(food);
        return (
          <Result key={key} $on={selected === key} aria-pressed={selected === key} onClick={() => onPick(food)}>
            <ResultName>
              {food.name}
              <Mono $mobileSize={11} style={{ fontWeight: 400 }}>{food.brand ? `${food.brand} · ` : ''}{food.source} · {fmt(food.kcal)} kcal / 100 {food.unit}</Mono>
            </ResultName>
            {trailing?.(food)}
          </Result>
        );
      })}
      {notice && <Muted>{NOTICE_TEXT[notice]}</Muted>}
      {q.length >= 2 && (
        <Manual onClick={() => onManual(q)}>
          <span style={{ flex: 'none', display: 'flex', color: c.lime }}><PlusIcon /></span>
          <span>Não achou? Cadastrar “{q}” com os valores do rótulo</span>
        </Manual>
      )}
    </Results>
  );
}
