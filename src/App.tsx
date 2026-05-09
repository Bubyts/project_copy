import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './components/layout/AdminLayout';
import ReaderLayout from './components/layout/ReaderLayout';
import DashboardPage from './pages/admin/DashboardPage';
import BooksPage from './pages/admin/BooksPage';
import AuthorsPage from './pages/admin/AuthorsPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import UsersPage from './pages/admin/UsersPage';
import LoansPage from './pages/admin/LoansPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import ReportsPage from './pages/admin/ReportsPage';
import BrowsePage from './pages/reader/BrowsePage';
import BookDetailPage from './pages/reader/BookDetailPage';
import MyLoansPage from './pages/reader/MyLoansPage';
import MyReservationsPage from './pages/reader/MyReservationsPage';
import ProfilePage from './pages/ProfilePage';

function RequireAuth({ children, role }: { children: JSX.Element; role?: 'admin' | 'reader' }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spin fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/reader'} replace />;
  }
  return children;
}

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Spin fullscreen />;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/reader'} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/reader" replace /> : <RegisterPage />}
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}
      >
        <Route index element={<DashboardPage />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="authors" element={<AuthorsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Reader routes */}
      <Route
        path="/reader"
        element={<RequireAuth><ReaderLayout /></RequireAuth>}
      >
        <Route index element={<BrowsePage />} />
        <Route path="book/:id" element={<BookDetailPage />} />
        <Route path="my-loans" element={<MyLoansPage />} />
        <Route path="my-reservations" element={<MyReservationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
