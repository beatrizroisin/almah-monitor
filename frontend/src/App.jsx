import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/Login';
import { DashboardPage } from './pages/dashboard/Dashboard';
import { AlertsPage } from './pages/alerts/Alerts';
import { SkusPage } from './pages/skus/Skus';
import { ClientsListPage } from './pages/clients/ClientsList';
import { ClientDetailPage } from './pages/clients/ClientDetail';
import { EditClientPage } from './pages/clients/EditClient';
import { IntegrationsListPage } from './pages/integrations/IntegrationsList';
import { ClientIntegrationsPage } from './pages/integrations/ClientIntegrations';
import { NotificationsPage } from './pages/notifications/Notifications';
import { WizardStep1 } from './pages/wizard/WizardStep1';
import { WizardStep2 } from './pages/wizard/WizardStep2';
import { WizardStep3 } from './pages/wizard/WizardStep3';
import { WizardStep4 } from './pages/wizard/WizardStep4';
import { WizardStep5 } from './pages/wizard/WizardStep5';
import { WizardSuccessPage } from './pages/wizard/WizardSuccess';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alertas" element={<AlertsPage />} />
          <Route path="/skus" element={<SkusPage />} />

          <Route path="/clientes" element={<ClientsListPage />} />
          <Route path="/clientes/:id" element={<ClientDetailPage />} />
          <Route path="/clientes/:id/editar" element={<EditClientPage />} />

          <Route path="/clientes/novo/1" element={<WizardStep1 />} />
          <Route path="/clientes/novo/2" element={<WizardStep2 />} />
          <Route path="/clientes/novo/3" element={<WizardStep3 />} />
          <Route path="/clientes/novo/4" element={<WizardStep4 />} />
          <Route path="/clientes/novo/5" element={<WizardStep5 />} />
          <Route path="/clientes/novo/sucesso" element={<WizardSuccessPage />} />

          <Route path="/integracoes" element={<IntegrationsListPage />} />
          <Route path="/integracoes/:id" element={<ClientIntegrationsPage />} />

          <Route path="/notificacoes" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
