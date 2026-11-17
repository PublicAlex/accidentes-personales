import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { Layout, PublicLayout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccidentListPage } from './pages/AccidentListPage';
import { AccidentDetailPage } from './pages/AccidentDetailPage';
import { AccidentNewPage } from './pages/AccidentNewPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/accidentes" element={<AccidentListPage />} />
        <Route path="/accidentes/nuevo" element={<AccidentNewPage />} />
        <Route path="/accidentes/:id" element={<AccidentDetailPage />} />
      </Route>
    </Routes>
  );
}
