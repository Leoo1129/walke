import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../api';
import { useCurrency } from '../context/CurrencyContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ orderId, total }) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!stripe || !elements) return;

        setPaying(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
        });

        if (stripeError) {
            setError(stripeError.message);
            setPaying(false);
            return;
        }

        try {
            await api.post(`/orders/${orderId}/pay`);
            navigate(`/orders/${orderId}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Payment confirmation failed');
            setPaying(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.heading}>Complete Payment</h2>
            <p style={styles.amount}>Total: <strong>{formatPrice(total)}</strong></p>
            <div style={styles.elementWrap}>
                <PaymentElement />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={!stripe || paying} style={styles.btn}>
                {paying ? 'Processing…' : `Pay ${formatPrice(total)}`}
            </button>
            <button type="button" onClick={() => navigate(`/orders/${orderId}`)} style={styles.skipBtn}>
                Pay later
            </button>
        </form>
    );
}

export default function Checkout() {
    const { id } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [clientSecret] = useState(state?.client_secret || null);
    const [total, setTotal] = useState(state?.total || 0);
    const [loading, setLoading] = useState(!clientSecret);

    useEffect(() => {
        if (clientSecret) return;
        // Fetch order details if we arrived without client_secret in state
        api.get(`/orders/${id}`)
            .then(r => {
                setTotal(r.data.total_price);
                // If already paid, skip checkout
                if (r.data.payment_status === 'paid') {
                    navigate(`/orders/${id}`);
                }
            })
            .catch(() => navigate('/orders'))
            .finally(() => setLoading(false));
    }, [id, clientSecret, navigate]);

    if (loading) return <p style={{ padding: 24 }}>Loading…</p>;

    if (!clientSecret) {
        return (
            <div style={styles.wrap}>
                <p>Payment session unavailable. <span style={styles.link} onClick={() => navigate(`/orders/${id}`)}>View order</span></p>
            </div>
        );
    }

    const options = {
        clientSecret,
        appearance: { theme: 'stripe' },
    };

    return (
        <div style={styles.wrap}>
            <Elements stripe={stripePromise} options={options}>
                <PaymentForm orderId={id} total={total} />
            </Elements>
        </div>
    );
}

const styles = {
    wrap: { padding: 24, maxWidth: 520, margin: '0 auto' },
    form: { display: 'flex', flexDirection: 'column', gap: 16 },
    heading: { marginBottom: 4 },
    amount: { fontSize: 18, marginBottom: 4 },
    elementWrap: { padding: '16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' },
    error: { color: '#e53e3e', fontSize: 14 },
    btn: { padding: '12px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 },
    skipBtn: { padding: '10px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontSize: 14 },
    link: { color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' },
};
