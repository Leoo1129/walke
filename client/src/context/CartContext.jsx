import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

// Tracks the number of items in the signed-in user's cart for the navbar badge.
// Call refreshCart() after anything that changes the cart.
export function CartProvider({ children }) {
    const { isLoggedIn } = useAuth();
    const [count, setCount] = useState(0);

    const refreshCart = useCallback(async () => {
        if (!isLoggedIn) { setCount(0); return; }
        try {
            const { data } = await api.get('/cart');
            setCount(Array.isArray(data) ? data.reduce((sum, item) => sum + item.quantity, 0) : 0);
        } catch {
            // Keep the last known count if the request fails
        }
    }, [isLoggedIn]);

    useEffect(() => { refreshCart(); }, [refreshCart]);

    return (
        <CartContext.Provider value={{ count, refreshCart }}>
            {children}
        </CartContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
    return useContext(CartContext);
}
