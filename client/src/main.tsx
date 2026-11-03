import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import { Toaster } from './components/Toast.tsx';
import { ProgressPage } from './features/progress/ProgressPage.tsx';
import { TodayPage } from './features/today/TodayPage.tsx';
import { TrainingPage } from './features/training/TrainingPage.tsx';
import { PlanProvider } from './PlanContext.tsx';
import { GlobalStyle } from './theme.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyle />
    <PlanProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/treino" element={<TrainingPage />} />
          <Route path="/progresso" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PlanProvider>
    <Toaster />
  </StrictMode>,
);
