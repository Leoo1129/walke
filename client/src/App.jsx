import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Marketplace from './pages/Marketplace';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import Businesses from './pages/Businesses';
import BusinessStorefront from './pages/BusinessStorefront';
import StorefrontBuilder from './pages/StorefrontBuilder';
import ManageMembers from './pages/ManageMembers';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Cart from './pages/Cart';
import Dashboard from './pages/Dashboard';

function PrivateRoute({ children }) {
    const { isLoggedIn } = useAuth();
    return isLoggedIn ? children : <Navigate to="/login" />;
}

function AppRoutes() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<Marketplace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/profile/:id" element={<SellerProfile />} />
                <Route path="/businesses" element={<Businesses />} />
                <Route path="/businesses/:id" element={<BusinessStorefront />} />
                <Route path="/businesses/:id/builder" element={<PrivateRoute><StorefrontBuilder /></PrivateRoute>} />
                <Route path="/businesses/:id/manage" element={<PrivateRoute><ManageMembers /></PrivateRoute>} />
                <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
                <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
                <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
