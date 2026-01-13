import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CreateAdminUser from "./pages/CreateAdminUser";
import CollaboratorDetailsPage from "./pages/CollaboratorDetails";
import ClientDetailsPage from "./pages/ClientDetails";
import ClientHistoryPage from "./pages/ClientHistory";
import DocumentsManager from "./pages/DocumentsManager";
import Portfolio from "./pages/Portfolio";
import Portfolio2 from "./pages/Portfolio2";
import TaskHistory from "./pages/TaskHistory";
import TaskDetails from "./pages/TaskDetails";
import Presets from "./pages/Presets";
import Projects from "./pages/Projects";
import ProjectWrite from "./pages/ProjectWrite";
import { AuthProvider } from "./contexts/AuthContext";
import { PageTitleProvider } from "./contexts/PageTitleContext";
import { HeaderActionsProvider } from "./contexts/HeaderActionsContext";

// Create a QueryClient instance with configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000
    }
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageTitleProvider>
              <HeaderActionsProvider>
                <SidebarProvider>
                  <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/create-admin" element={<CreateAdminUser />} />
              <Route path="/task/:id" element={
                <ProtectedRoute>
                  <TaskDetails />
                </ProtectedRoute>
              } />
              <Route path="/collaborator/:id" element={
                <ProtectedRoute>
                  <CollaboratorDetailsPage />
                </ProtectedRoute>
              } />
              <Route path="/client/:id" element={
                <ProtectedRoute>
                  <ClientDetailsPage />
                </ProtectedRoute>
              } />
              <Route path="/client/:id/history" element={
                <ProtectedRoute>
                  <ClientHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute>
                  <DocumentsManager />
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/expense-requests" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/tasks/archived" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/chatbot" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/collaborators" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/courses" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/support" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/portfolio2" element={<Portfolio2 />} />
              <Route path="/task-history" element={
                <ProtectedRoute>
                  <TaskHistory />
                </ProtectedRoute>
              } />
              <Route path="/presets" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/presets/new" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/presets/:presetId" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/projetos" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/projetos/:id" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/projetos/:id/edit" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/projetos/:id/map" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
                  </Routes>
                </SidebarProvider>
              </HeaderActionsProvider>
            </PageTitleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
