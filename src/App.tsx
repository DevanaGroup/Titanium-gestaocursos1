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
import CourseDetailsPage from "./pages/CourseDetailsPage";
import ClientDetailsPage from "./pages/ClientDetails";
import ClientHistoryPage from "./pages/ClientHistory";
import DocumentsManager from "./pages/DocumentsManager";
import TaskHistory from "./pages/TaskHistory";
import TaskDetails from "./pages/TaskDetails";
import Presets from "./pages/Presets";
import AdminDatabase from "./pages/AdminDatabase";
import LessonRequestPage from "./pages/LessonRequestPage";
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
                  <Navigate to="/financial/expense-requests" replace />
                </ProtectedRoute>
              } />
              <Route path="/financial/expense-requests" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/financial/incomes" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/financial/expenses" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/financial/teacher-payments" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/financial/reports" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/eventos" element={
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
              <Route path="/courses/:id" element={
                <ProtectedRoute>
                  <CourseDetailsPage />
                </ProtectedRoute>
              } />
              <Route path="/lessons" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/lessons/solicitar" element={<LessonRequestPage />} />
              <Route path="/teachers" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
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
              <Route path="/database" element={
                <ProtectedRoute>
                  <AdminDatabase />
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
