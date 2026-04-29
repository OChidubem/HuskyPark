
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LotDetail from "./pages/LotDetail";
import AIRecommend from "./pages/AIRecommend";
import Permits from "./pages/Permits";
import Analytics from "./pages/Analytics";
import AdminEvents from "./pages/admin/Events";
import { AuthProvider, useAuth } from "./hooks/useAuth";

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex-shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="lots/:id" element={<LotDetail />} />
          <Route path="recommend" element={<AIRecommend />} />
          <Route path="permits" element={<Permits />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="admin" element={<Navigate to="/admin/events" replace />} />
          <Route path="admin/events" element={<AdminEvents />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

