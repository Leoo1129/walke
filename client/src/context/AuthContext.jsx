import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

// Read the exp claim without verifying the signature (the server does that)
function isExpired(token) {
    try {
        const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof exp === 'number' && exp * 1000 <= Date.now();
    } catch {
        return true;
    }
}

function loadSession() {
    const token = localStorage.getItem('token');
    if (!token || isExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return { token: null, user: null };
    }
    try {
        return { token, user: JSON.parse(localStorage.getItem('user')) };
    } catch {
        return { token, user: null };
    }
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(loadSession);
    const [expired, setExpired] = useState(false);

    function login(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setExpired(false);
        setSession({ token, user });
    }

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setSession({ token: null, user: null });
    }, []);

    useEffect(() => {
        function handleExpired() {
            if (!localStorage.getItem('token')) return;
            logout();
            setExpired(true);
        }
        window.addEventListener('auth:expired', handleExpired);
        return () => window.removeEventListener('auth:expired', handleExpired);
    }, [logout]);

    const value = {
        token: session.token,
        user: session.user,
        login,
        logout,
        isLoggedIn: !!session.token,
        sessionExpired: expired,
        clearSessionExpired: () => setExpired(false),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}
