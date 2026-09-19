import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Sends the user to the login page with a message when their session expires mid-use
export default function SessionWatcher() {
    const { sessionExpired, clearSessionExpired } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (!sessionExpired) return;
        clearSessionExpired();
        toast.info('Your session has expired. Please log in again.');
        navigate('/login');
    }, [sessionExpired, clearSessionExpired, toast, navigate]);

    return null;
}
