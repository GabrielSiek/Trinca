import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Plan } from '../../shared/types.ts';
import { api } from './api.ts';
import { Button, CenteredState } from './components/ui.tsx';

interface PlanValue {
  plan: Plan;
  setPlan: (plan: Plan) => void;
  reloadPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanValue | null>(null);

export function usePlan(): PlanValue {
  const value = useContext(PlanContext);
  if (!value) throw new Error('usePlan fora do PlanProvider');
  return value;
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [failed, setFailed] = useState(false);

  const reloadPlan = useCallback(async () => {
    setFailed(false);
    try {
      setPlan(await api.plan());
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void reloadPlan();
  }, [reloadPlan]);

  if (failed) {
    return (
      <CenteredState>
        Não consegui falar com o servidor.
        <Button $variant="outline" onClick={reloadPlan}>Tentar de novo</Button>
      </CenteredState>
    );
  }
  if (!plan) return <CenteredState>Carregando…</CenteredState>;

  return <PlanContext.Provider value={{ plan, setPlan, reloadPlan }}>{children}</PlanContext.Provider>;
}
