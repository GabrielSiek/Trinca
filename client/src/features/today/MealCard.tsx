import styled from 'styled-components';
import type { Dish } from '../../../../shared/types.ts';
import { ChevronDownIcon, CloseIcon, PlusIcon, SwapIcon } from '../../components/icons.tsx';
import { Button, Check, Eyebrow, IconButton, Mono, Tag } from '../../components/ui.tsx';
import { useIsMobile } from '../../hooks.ts';
import { fmt } from '../../lib/format.ts';
import type { ItemView, MealView } from '../../lib/nutrition.ts';
import { c, mobile, mono } from '../../theme.ts';

const Article = styled.article<{ $done: boolean }>`
  display: flex;
  gap: 18px;
  align-items: flex-start;
  background: ${c.surface};
  border: 1px solid ${(p) => (p.$done ? c.limeEdge : c.line)};
  border-radius: 18px;
  padding: 20px 24px;
  ${mobile} {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
    border-radius: 16px;
  }
`;

const Body = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 20px;
  min-height: 44px;
  align-content: center;
`;

const Names = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
`;

const MealName = styled.h3`
  font-size: 24px;
  font-weight: 700;
  font-stretch: 78%;
`;

const MacroLine = styled.p`
  ${mono}
  font-size: 13px;
  color: ${c.muted};
  strong {
    color: ${c.text};
    font-weight: 500;
  }
  ${mobile} {
    font-size: 12px;
  }
`;

const OptionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 20px;
  ${mobile} {
    flex-wrap: nowrap;
  }
`;

const OptionName = styled.p`
  font-size: 17px;
  font-weight: 600;
  ${mobile} {
    font-size: 16px;
  }
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, max(150px, calc((100% - 32px) / 5))), 1fr));
  gap: 8px;
  ${mobile} {
    display: flex;
    overflow-x: auto;
    margin: 0 -12px;
    padding: 2px 12px 6px;
  }
`;

const OptionWrap = styled.div`
  position: relative;
  display: flex;
  ${mobile} {
    flex: none;
    width: 140px;
  }
`;

const OptionTile = styled.button.attrs({ type: 'button' })<{ $on: boolean }>`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 44px;
  padding: 12px 14px;
  text-align: left;
  border-radius: 12px;
  cursor: pointer;
  background: ${(p) => (p.$on ? c.limeTint : c.tile)};
  border: 1.5px solid ${(p) => (p.$on ? c.lime : c.line)};
  color: ${c.text};
  ${mobile} {
    gap: 3px;
    padding: 10px 12px;
  }
`;

const OptionTitle = styled.span`
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  ${mobile} {
    font-size: 14px;
    line-height: 1.2;
  }
`;

const RemoveOption = styled(IconButton)`
  position: absolute;
  top: 0;
  right: 0;
  width: 36px;
  height: 36px;
`;

const NewOption = styled.button.attrs({ type: 'button' })`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px dashed ${c.dash};
  background: transparent;
  color: ${c.lime};
  text-align: center;
  cursor: pointer;
  ${mobile} {
    flex: none;
    width: 112px;
    padding: 10px 12px;
  }
`;

const ItemList = styled.ul<{ $columns: boolean }>`
  margin: 0;
  padding: 0;
  list-style: none;
  ${(p) => p.$columns && 'display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); column-gap: 28px;'}
`;

const ItemRow = styled.li`
  border-bottom: 1px solid ${c.lineSoft};
`;

const ItemButton = styled.button.attrs({ type: 'button' })`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0;
  background: transparent;
  border: 0;
  color: ${c.text};
  text-align: left;
  cursor: pointer;
  &:hover {
    color: ${c.lime};
  }
  ${mobile} {
    gap: 10px;
  }
`;

const ItemLabel = styled.span`
  flex: 1 1 auto;
  min-width: 0;
`;

const ExpandButton = styled.button.attrs({ type: 'button' })`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  color: ${c.text};
`;

const MobileHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MobileNames = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
`;

const MobileName = styled.span`
  font-size: 19px;
  font-weight: 700;
  font-stretch: 80%;
`;

const MobileSummary = styled.span`
  font-size: 13px;
  color: ${c.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Chevron = styled.span<{ $open: boolean }>`
  display: flex;
  color: ${c.muted};
  transform: ${(p) => (p.$open ? 'rotate(180deg)' : 'none')};
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid ${c.lineSoft};
`;

interface Props {
  meal: MealView;
  options: Dish[];
  pickerOpen: boolean;
  expanded: boolean;
  onToggleDone: () => void;
  onToggleExpanded: () => void;
  onTogglePicker: () => void;
  onPickDish: (dish: Dish) => void;
  onNewDish: () => void;
  onRemoveDish: (dish: Dish) => void;
  onItem: (item: ItemView) => void;
  onBackToPlan: () => void;
}

export function MealCard(props: Props) {
  const { meal, options, pickerOpen, expanded, onToggleDone, onToggleExpanded, onTogglePicker, onPickDish, onNewDish, onRemoveDish, onItem, onBackToPlan } = props;
  const isMobile = useIsMobile();
  const name = meal.name.toLowerCase();
  const m = meal.macros;

  const optionRow = (meal.isOption || meal.improvised) && (
    <OptionRow>
      <OptionName>{isMobile ? meal.optionNameShort : meal.optionName}</OptionName>
      {meal.improvised ? (
        <Button $variant="neutral" onClick={onBackToPlan} style={{ flex: 'none', padding: isMobile ? '0 12px' : undefined }}>Voltar ao plano</Button>
      ) : (
        <Button $variant="neutral" aria-expanded={pickerOpen} onClick={onTogglePicker} style={{ flex: 'none', padding: isMobile ? '0 12px' : '0 16px', borderRadius: 10 }}>
          {!isMobile && <SwapIcon />}
          {pickerOpen ? (isMobile ? 'Fechar' : 'Fechar opções') : 'Trocar prato'}
        </Button>
      )}
    </OptionRow>
  );

  const picker = pickerOpen && meal.isOption && !meal.improvised && (
    <Options role="group" aria-label="Opções de prato principal">
      {options.map((dish) => {
        const on = dish.id === meal.dish.id;
        return (
          <OptionWrap key={dish.id}>
            <OptionTile $on={on} aria-pressed={on} onClick={() => onPickDish(dish)}>
              <Eyebrow $size={11} $mobileSize={10} $color={on ? c.lime : c.muted} style={{ letterSpacing: '0.06em' }}>Opção {dish.code}</Eyebrow>
              <OptionTitle>{dish.short}</OptionTitle>
              <Mono $mobileSize={11}>{fmt(dish.kcal)} kcal · P {fmt(dish.p)}</Mono>
            </OptionTile>
            {dish.custom && (
              <RemoveOption $bare $color={c.muted} aria-label={`Remover ${dish.short} da lista`} onClick={() => onRemoveDish(dish)}>
                <CloseIcon size={14} />
              </RemoveOption>
            )}
          </OptionWrap>
        );
      })}
      <NewOption onClick={onNewDish}>
        <PlusIcon size={22} />
        <OptionTitle style={{ color: c.text }}>Novo prato</OptionTitle>
        {!isMobile && <Mono>adicionar à lista</Mono>}
      </NewOption>
    </Options>
  );

  const items = (
    <ItemList $columns={!isMobile}>
      {meal.items.map((item) => (
        <ItemRow key={item.key}>
          <ItemButton aria-label={meal.improvised ? `Editar ${item.label}` : `Trocar ${item.label}`} onClick={() => onItem(item)}>
            <ItemLabel>{item.label}</ItemLabel>
            {item.extra && <Tag>jogo</Tag>}
            {item.swapped && <Tag $tone="lime">troca</Tag>}
            {item.kcal !== null && <Mono style={{ flex: 'none' }}>{fmt(item.kcal)}{!isMobile && ' kcal'}</Mono>}
            <span style={{ flex: 'none', display: 'flex', color: c.faint }}><SwapIcon size={isMobile ? 16 : 18} /></span>
          </ItemButton>
        </ItemRow>
      ))}
    </ItemList>
  );

  if (isMobile) {
    return (
      <Article $done={meal.done}>
        <MobileHead>
          <Check checked={meal.done} label={`Marcar ${name} como feito`} onClick={onToggleDone} />
          <ExpandButton aria-expanded={expanded} onClick={onToggleExpanded}>
            <MobileNames>
              <MobileName>{meal.name}</MobileName>
              <MobileSummary>{meal.summary}</MobileSummary>
            </MobileNames>
            <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mono $size={13} $color={c.text} style={{ fontWeight: 500 }}>{fmt(m.kcal)}</Mono>
              <Chevron $open={expanded}><ChevronDownIcon /></Chevron>
            </span>
          </ExpandButton>
        </MobileHead>
        {expanded && (
          <Details>
            <MacroLine>P {fmt(m.p)} · C {fmt(m.c)} · G {fmt(m.g)}</MacroLine>
            {optionRow}
            {picker}
            {items}
          </Details>
        )}
      </Article>
    );
  }

  return (
    <Article $done={meal.done}>
      <Check checked={meal.done} label={`Marcar ${name} como feito`} onClick={onToggleDone} />
      <Body>
        <Head>
          <Names>
            <MealName>{meal.name}</MealName>
            <Eyebrow style={{ letterSpacing: '0.06em' }}>{meal.sub}</Eyebrow>
          </Names>
          <MacroLine><strong>{fmt(m.kcal)} kcal</strong> · P {fmt(m.p)} · C {fmt(m.c)} · G {fmt(m.g)}</MacroLine>
        </Head>
        {optionRow}
        {picker}
        {items}
      </Body>
    </Article>
  );
}
