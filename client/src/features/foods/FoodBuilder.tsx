import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import type { Food, FoodSource, FoodUnit, LoggedItem, Macros } from '../../../../shared/types.ts';
import { api } from '../../api.ts';
import { CloseIcon, SearchIcon } from '../../components/icons.tsx';
import { toastError } from '../../components/Toast.tsx';
import { BareInput, Button, FieldBox, Heading, IconButton, Label, Mono, Muted, TextArea } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { fmt } from '../../lib/format.ts';
import { macrosOf, scaleMacros, sumLogged } from '../../lib/nutrition.ts';
import { c, mobile, mono } from '../../theme.ts';
import { FoodFormModal } from './FoodFormModal.tsx';
import { FoodSearch, rememberFood } from './FoodSearch.tsx';

interface RowFood {
  name: string;
  source: FoodSource;
  unit: FoodUnit;
  per100: Macros;
}

interface Row {
  key: number;
  text: string;
  qty: string;
  food: RowFood | null;
}

const toRowFood = (food: Food): RowFood => ({ name: food.name, source: food.source, unit: food.unit, per100: macrosOf(food) });

let nextKey = 1;

export function useBuilder(initial: LoggedItem[] | null) {
  const [rows, setRows] = useState<Row[]>(() =>
    (initial ?? []).map((item) => ({ key: nextKey++, text: item.name, qty: String(item.qty), food: { name: item.name, source: item.source, unit: item.unit, per100: item.per100 } })),
  );
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);

  const items = useMemo(
    () => rows.filter((r): r is Row & { food: RowFood } => !!r.food).map((r): LoggedItem => ({ ...r.food, qty: Number(r.qty) || 0 })),
    [rows],
  );

  const parse = async () => {
    setParsing(true);
    try {
      const parsed = await api.parseFoods(text);
      setRows(parsed.map((row) => ({ key: nextKey++, text: row.text, qty: String(row.qty), food: row.food && toRowFood(row.food) })));
    } catch (err) {
      toastError(err);
    } finally {
      setParsing(false);
    }
  };

  const add = (food: Food) => setRows((list) => [...list, { key: nextKey++, text: food.name, qty: '100', food: toRowFood(food) }]);
  const resolve = (key: number, food: Food) => setRows((list) => list.map((r) => (r.key === key ? { ...r, food: toRowFood(food) } : r)));
  const remove = (key: number) => setRows((list) => list.filter((r) => r.key !== key));
  const setQty = (key: number, qty: string) => setRows((list) => list.map((r) => (r.key === key ? { ...r, qty } : r)));

  return {
    rows, text, setText, parsing, parse, add, resolve, remove, setQty, items,
    total: sumLogged(items),
    unresolved: rows.filter((r) => !r.food).length,
  };
}

export type Builder = ReturnType<typeof useBuilder>;

const Group = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 10}px;
  ${mobile} {
    gap: 8px;
  }
`;

const HintRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 20px;
  ${mobile} {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ListHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  ${mobile} {
    gap: 8px;
    padding-bottom: 6px;
  }
`;

const COLUMNS = 'minmax(200px, 1fr) 112px 56px 44px 44px 44px 44px';

const TableScroll = styled.div`
  overflow-x: auto;
`;

const Table = styled.div`
  min-width: 640px;
  display: flex;
  flex-direction: column;
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNS};
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid ${c.lineStrong};
  ${mono}
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${c.muted};
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${COLUMNS};
  gap: 10px;
  align-items: center;
  min-height: 56px;
  border-bottom: 1px solid ${c.lineSoft};
  font-variant-numeric: tabular-nums;
`;

const Right = styled.span<{ $strong?: boolean }>`
  text-align: right;
  ${mono}
  font-size: ${(p) => (p.$strong ? 14 : 13)}px;
  color: ${(p) => (p.$strong ? c.text : c.muted)};
`;

const NameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
  font-weight: 600;
`;

const MobileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 60px;
  border-bottom: 1px solid ${c.lineSoft};
`;

const MissingText = styled(Mono)`
  color: ${c.orange};
`;

function QtyField({ row, onChange, isMobile }: { row: Row; onChange: (qty: string) => void; isMobile: boolean }) {
  return (
    <FieldBox $height={40} $radius={10} style={{ width: isMobile ? 78 : undefined, flex: isMobile ? 'none' : undefined, padding: isMobile ? '0 8px' : '0 10px' }}>
      <BareInput
        inputMode="numeric"
        aria-label={`Quantidade de ${row.food?.name ?? row.text}`}
        value={row.qty}
        $mono
        $size={14}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <Mono $mobileSize={11}>{row.food?.unit ?? 'g'}</Mono>
    </FieldBox>
  );
}

interface Props {
  builder: Builder;
  textLabel: string;
  placeholder: string;
}

export function FoodBuilder({ builder, textLabel, placeholder }: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [resolving, setResolving] = useState<number | null>(null);
  const [manualName, setManualName] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const place = (food: Food) => {
    if (resolving !== null) builder.resolve(resolving, food);
    else builder.add(food);
    setResolving(null);
    setQuery('');
    void rememberFood(food);
  };

  const startResolving = (row: Row) => {
    setResolving(row.key);
    setQuery(row.text);
    searchInput.current?.focus();
  };

  const count = builder.rows.length;
  const remove = (row: Row) => (
    <IconButton $bare $color={c.muted} aria-label={`Remover ${row.food?.name ?? row.text}`} onClick={() => builder.remove(row.key)} style={{ borderRadius: 10 }}>
      <CloseIcon />
    </IconButton>
  );
  const sourceLine = (row: Row) => (row.food!.per100.kcal ? `${fmt(row.food!.per100.kcal)} kcal / 100 ${row.food!.unit}` : 'sem calorias');

  return (
    <>
      <Group>
        <Label htmlFor="alimentos-texto">{textLabel}</Label>
        <TextArea id="alimentos-texto" rows={isMobile ? 4 : 3} placeholder={placeholder} value={builder.text} onChange={(e) => builder.setText(e.target.value)} />
        <HintRow>
          <Muted>Escreva do seu jeito, com quantidades se souber. O app separa os alimentos e busca os valores.</Muted>
          <Button $variant="outline" $height={isMobile ? 48 : 44} disabled={!builder.text.trim() || builder.parsing} onClick={() => void builder.parse()}>
            <SearchIcon />
            {builder.parsing ? 'Buscando…' : 'Buscar valores'}
          </Button>
        </HintRow>
      </Group>

      <Group $gap={0} style={{ gap: 0 }}>
        <ListHead>
          <Heading as="h2" $size={24} $mobile={22}>{isMobile ? 'Encontrados' : 'Alimentos encontrados'}</Heading>
          <Mono $mobileSize={11}>{count} {count === 1 ? 'alimento' : 'alimentos'}</Mono>
        </ListHead>

        {isMobile ? (
          builder.rows.map((row) => {
            const m = row.food && scaleMacros(row.food.per100, (Number(row.qty) || 0) / 100);
            return (
              <MobileRow key={row.key}>
                <NameCell>
                  {row.food?.name ?? row.text}
                  {m ? (
                    <Mono $size={11} style={{ fontWeight: 400 }}>{fmt(m.kcal)} kcal · P {fmt(m.p)} · C {fmt(m.c)} · G {fmt(m.g)} · {row.food!.source}</Mono>
                  ) : (
                    <Button $variant="ghost" onClick={() => startResolving(row)} style={{ alignSelf: 'flex-start', minHeight: 32, padding: 0, color: c.orange }}>Não encontrado · buscar</Button>
                  )}
                </NameCell>
                <QtyField row={row} isMobile onChange={(qty) => builder.setQty(row.key, qty)} />
                {remove(row)}
              </MobileRow>
            );
          })
        ) : (
          <TableScroll>
            <Table>
              <TableHead>
                <span>Alimento</span><span>Quantidade</span><Right as="span" style={{ fontSize: 11 }}>kcal</Right><Right style={{ fontSize: 11 }}>P</Right><Right style={{ fontSize: 11 }}>C</Right><Right style={{ fontSize: 11 }}>G</Right><span />
              </TableHead>
              {builder.rows.map((row) => {
                const m = row.food && scaleMacros(row.food.per100, (Number(row.qty) || 0) / 100);
                return (
                  <TableRow key={row.key}>
                    <NameCell>
                      {row.food?.name ?? row.text}
                      {row.food ? <Mono $size={11} style={{ fontWeight: 400 }}>{row.food.source} · {sourceLine(row)}</Mono> : <MissingText $size={11} style={{ fontWeight: 400 }}>não encontrado</MissingText>}
                    </NameCell>
                    <QtyField row={row} isMobile={false} onChange={(qty) => builder.setQty(row.key, qty)} />
                    {m ? (
                      <>
                        <Right $strong>{fmt(m.kcal)}</Right>
                        <Right>{fmt(m.p)}</Right>
                        <Right>{fmt(m.c)}</Right>
                        <Right>{fmt(m.g)}</Right>
                      </>
                    ) : (
                      <Button $variant="ghost" onClick={() => startResolving(row)} style={{ gridColumn: 'span 4', justifySelf: 'end', color: c.orange }}>Buscar</Button>
                    )}
                    {remove(row)}
                  </TableRow>
                );
              })}
            </Table>
          </TableScroll>
        )}

        <div style={{ marginTop: 10 }}>
          <FoodSearch
            id="adicionar-alimento"
            label="Adicionar alimento"
            placeholder={resolving !== null ? 'Buscar o alimento que faltou' : 'Adicionar alimento (busca na TACO e no Open Food Facts)'}
            dashed
            query={query}
            onQuery={setQuery}
            onPick={place}
            onManual={setManualName}
            inputRef={searchInput}
          />
        </div>
      </Group>

      {manualName !== null && (
        <FoodFormModal
          initialName={manualName}
          onClose={() => setManualName(null)}
          onSaved={(food) => {
            setManualName(null);
            place(food);
          }}
        />
      )}
    </>
  );
}
