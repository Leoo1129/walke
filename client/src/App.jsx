import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
// The landing page ships in the main bundle; every other page is fetched on first visit
import Marketplace from './pages/Marketplace';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const Businesses = lazy(() => import('./pages/Businesses'));
const BusinessStorefront = lazy(() => import('./pages/BusinessStorefront'));
const StorefrontBuilder = lazy(() => import('./pages/StorefrontBuilder'));
const ManageMembers = lazy(() => import('./pages/ManageMembers'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Checkout = lazy(() => import('./pages/Checkout'));

function PrivateRoute({ children }) {
    const { isLoggedIn } = useAuth();
    return isLoggedIn ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
    const { user, isLoggedIn } = useAuth();
    if (!isLoggedIn) return <Navigate to="/login" />;
    if (!user?.is_admin) return <Navigate to="/" />;
    return children;
}

function AppRoutes() {
    return (
        <>
            <Navbar />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<Marketplace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/profile/:id" element={<SellerProfile />} />
                    <Route path="/businesses" element={<Businesses />} />
                    <Route path="/businesses/:id" element={<BusinessStorefront />} />
                    <Route path="/businesses/:id/builder" element={<PrivateRoute><StorefrontBuilder /></PrivateRoute>} />
                    <Route path="/businesses/:id/manage" element={<PrivateRoute><ManageMembers /></PrivateRoute>} />
                    <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
                    <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
                    <Route path="/checkout/:id" element={<PrivateRoute><Checkout /></PrivateRoute>} />
                    <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
        </>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <CurrencyProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <AppRoutes />
                    </BrowserRouter>
                </AuthProvider>
            </CurrencyProvider>
        </ThemeProvider>
    );
}
