import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);
const DURATION_MS = 4000;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(0);

    const dismiss = useCallback(id => {
        setToasts(list => list.filter(t => t.id !== id));
    }, []);

    const show = useCallback((type, message) => {
        const id = nextId.current++;
        setToasts(list => [...list.slice(-3), { id, type, message }]);
        setTimeout(() => dismiss(id), DURATION_MS);
    }, [dismiss]);

    const toast = useMemo(() => ({
        success: message => show('success', message),
        error: message => show('error', message),
        info: message => show('info', message),
    }), [show]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-stack" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
                        <span>{t.message}</span>
                        <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    return useContext(ToastContext);
}
