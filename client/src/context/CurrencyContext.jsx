import { createContext, useContext, useEffect, useState } from 'react';

const CURRENCIES = [
    { code: 'USD', symbol: '$',    label: 'USD – US Dollar' },
    { code: 'EUR', symbol: '€',    label: 'EUR – Euro' },
    { code: 'GBP', symbol: '£',    label: 'GBP – British Pound' },
    { code: 'JPY', symbol: '¥',    label: 'JPY – Japanese Yen' },
    { code: 'AUD', symbol: 'A$',   label: 'AUD – Australian Dollar' },
    { code: 'CAD', symbol: 'C$',   label: 'CAD – Canadian Dollar' },
    { code: 'CHF', symbol: 'CHF ', label: 'CHF – Swiss Franc' },
    { code: 'CNY', symbol: '¥',    label: 'CNY – Chinese Yuan' },
    { code: 'INR', symbol: '₹',    label: 'INR – Indian Rupee' },
    { code: 'SGD', symbol: 'S$',   label: 'SGD – Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$',  label: 'HKD – Hong Kong Dollar' },
    { code: 'KRW', symbol: '₩',    label: 'KRW – South Korean Won' },
    { code: 'MXN', symbol: 'MX$',  label: 'MXN – Mexican Peso' },
    { code: 'BRL', symbol: 'R$',   label: 'BRL – Brazilian Real' },
    { code: 'AED', symbol: 'AED ', label: 'AED – UAE Dirham' },
];

const NO_DECIMAL = new Set(['JPY', 'KRW']);

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'USD');
    const [rates, setRates] = useState({});

    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(r => r.json())
            .then(d => { if (d.rates) setRates(d.rates); })
            .catch(() => {});
    }, []);

    function selectCurrency(code) {
        setCurrency(code);
        localStorage.setItem('currency', code);
    }

    function formatPrice(usdAmount) {
        const amount = Number(usdAmount) || 0;
        const rate = rates[currency] || 1;
        const converted = amount * rate;
        const entry = CURRENCIES.find(c => c.code === currency);
        const symbol = entry ? entry.symbol : `${currency} `;
        const formatted = NO_DECIMAL.has(currency)
            ? Math.round(converted).toLocaleString()
            : converted.toFixed(2);
        return `${symbol}${formatted}`;
    }

    return (
        <CurrencyContext.Provider value={{ currency, currencies: CURRENCIES, selectCurrency, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
    return useContext(CurrencyContext);
}
