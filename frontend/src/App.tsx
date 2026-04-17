import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LotDetail from "./pages/LotDetail";
import AIRecommend from "./pages/AIRecommend";
import Permits from "./pages/Permits";
import AdminEvents from "./pages/admin/Events";
import { useAuth } from "./hooks/useAuth";

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 flex-shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="dashboard"       element={<Dashboard />} />
          <Route path="lots/:id"        element={<LotDetail />} />
          <Route path="recommend"       element={<AIRecommend />} />
          <Route path="permits"         element={<Permits />} />
          <Route path="admin"           element={<Navigate to="/admin/events" replace />} />
          <Route path="admin/events"    element={<AdminEvents />} />
          <Route path="*"               element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"  element={<Login />} />
          <Route path="/*"      element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
