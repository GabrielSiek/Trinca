import { useState } from 'react';
import styled from 'styled-components';
import type { LibraryExercise, Workout } from '../../../../shared/types.ts';
import { PlusIcon, SearchIcon } from '../../components/icons.tsx';
import { BareInput, FieldBox, Mono, VisuallyHidden } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { c, mobile } from '../../theme.ts';

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  background: ${c.surface};
  border: 1px solid ${c.line};
  border-radius: 14px;
  ${mobile} {
    gap: 8px;
    padding: 12px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 8px;
`;

const Item = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 14px;
  text-align: left;
  border-radius: 12px;
  cursor: pointer;
  background: ${c.tile};
  border: 1px solid ${c.line};
  color: ${c.text};
  font-weight: 600;
`;

const Create = styled.button.attrs({ type: 'button' })`
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

const Plus = styled.span`
  flex: none;
  display: flex;
  color: ${c.lime};
`;

const MOBILE_LIMIT = 5;

interface Props {
  library: LibraryExercise[];
  workout: Workout;
  onAdd: (name: string, muscle: string) => void;
}

export function ExerciseSearch({ library, workout, onAdd }: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const inWorkout = workout.exercises.map((e) => e.name.toLowerCase());
  const found = library.filter((e) => !inWorkout.includes(e.name.toLowerCase()) && (!q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)));
  const shown = isMobile ? found.slice(0, MOBILE_LIMIT) : found;

  const add = (name: string, muscle: string) => {
    onAdd(name, muscle);
    setQuery('');
  };

  return (
    <Panel>
      <FieldBox $height={50} style={{ gap: 10, padding: '0 14px' }}>
        <span style={{ flex: 'none', display: 'flex', color: c.muted }}><SearchIcon /></span>
        <VisuallyHidden as="label" htmlFor="busca-exercicio">Buscar exercício</VisuallyHidden>
        <BareInput id="busca-exercicio" placeholder={isMobile ? 'Exercício ou grupo muscular' : 'Buscar exercício ou grupo muscular'} value={query} onChange={(e) => setQuery(e.target.value)} style={{ height: 44 }} />
      </FieldBox>
      <Grid>
        {shown.map((e) => (
          <Item key={e.name} onClick={() => add(e.name, e.muscle)}>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              {e.name}
              <Mono $size={11} style={{ fontWeight: 400 }}>{e.muscle}</Mono>
            </span>
            <Plus><PlusIcon /></Plus>
          </Item>
        ))}
        {q.length > 1 && (
          <Create onClick={() => add(query.trim(), 'Personalizado')}>
            <Plus><PlusIcon /></Plus>
            <span>Criar “{query.trim()}”</span>
          </Create>
        )}
      </Grid>
    </Panel>
  );
}
