import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import TopBar from './components/TopBar';
import KiteLoader from './components/KiteLoader';
import Login from './pages/Login';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceList from './pages/InvoiceList';
import Dashboard from './pages/Dashboard';
import PriceManager from './pages/PriceManager';
import TeamManager from './pages/TeamManager';
import Inventory from './pages/Inventory';
import Verify from './pages/Verify';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <KiteLoader full label="Opening your account…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/new'} replace />;
}

const admin = (el) => <ProtectedRoute roles={['admin']}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <>
    <TopBar />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:code?" element={<Verify />} />
      <Route path="/" element={<Home />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/new" element={<CreateInvoice />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/admin" element={admin(<Dashboard />)} />
        <Route path="/admin/inventory" element={admin(<Inventory />)} />
        <Route path="/admin/prices" element={admin(<PriceManager />)} />
        <Route path="/admin/team" element={admin(<TeamManager />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}