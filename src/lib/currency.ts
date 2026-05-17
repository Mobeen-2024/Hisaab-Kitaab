export let exchangeRates: Record<string, number> = {
  'PKR': 1,
  'USD': 0.0036,
  'EUR': 0.0033,
  'GBP': 0.0028,
  'INR': 0.30,
  'AUD': 0.0055,
  'CAD': 0.0049,
  'SGD': 0.0048,
  'AED': 0.013,
  'SAR': 0.013,
  'JPY': 0.54,
  'CNY': 0.026,
  'BRL': 0.018,
  'ZAR': 0.068,
  'TRY': 0.12,
  'BDT': 0.40,
  'NGN': 4.10,
  'IDR': 57.0,
  'MYR': 0.017,
  'PHP': 0.20,
};

export { exchangeRates as mockExchangeRates };

export const fetchExchangeRates = async () => {
  // Try multiple CORS-safe sources. The app works perfectly fine on static
  // rates so any network failure is silently swallowed — NEVER throws.
  const sources = [
    // Source 1: ExchangeRate-API (free, CORS-enabled)
    async () => {
      const r = await fetch('https://open.er-api.com/v6/latest/PKR', { mode: 'cors' });
      const d = await r.json();
      if (d && d.rates) return d.rates as Record<string, number>;
      return null;
    },
    // Source 2: Currency-API (free GitHub-hosted CDN, always CORS-open)
    async () => {
      const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/pkr.json');
      const d = await r.json();
      // Response shape: { pkr: { usd: 0.0036, eur: ... } }
      if (d && d.pkr) {
        const rates: Record<string, number> = {};
        for (const [k, v] of Object.entries(d.pkr)) {
          rates[k.toUpperCase()] = v as number;
        }
        return rates;
      }
      return null;
    },
  ];

  for (const trySource of sources) {
    try {
      const rates = await trySource();
      if (rates) {
        exchangeRates = { ...exchangeRates, ...rates, PKR: 1 };
        return true;
      }
    } catch {
      // silently try next source
    }
  }

  // All sources failed — app continues using the static fallback rates above.
  console.info('[Hisaib Kitaib] Exchange rates unavailable, using built-in static rates.');
  return false;
};

// Initial fetch — fire-and-forget, never blocks the UI
fetchExchangeRates();


export const calculateConvertedAmount = (amountInPKR: number, targetCurrency: string): number => {
  if (targetCurrency === 'PKR') return amountInPKR;
  const rate = exchangeRates[targetCurrency] || 1;
  return amountInPKR * rate;
};

// Map our custom lang codes to standard BCP 47 language tags for Intl.NumberFormat
const getLocaleMap = (lang: string) => {
  const map: Record<string, string> = {
    'en': 'en-US',
    'ur': 'ur-PK',
    'ru': 'en-PK', // Roman Urdu - fallback to en-PK
    'hi': 'hi-IN',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'ar': 'ar-SA',
    'zh': 'zh-CN',
    'pt': 'pt-BR',
    'bn': 'bn-BD',
  };
  return map[lang] || 'en-US';
};

export const formatCurrency = (valInPKR: number, currency: string, lang: string, compact: boolean = false) => {
  const convertedVal = calculateConvertedAmount(valInPKR, currency);
  const locale = getLocaleMap(lang);

  // Custom fraction digits based on currency
  // JPY typically has 0 fraction digits, others usually 2.
  const maximumFractionDigits = ['JPY', 'PKR', 'INR', 'IDR'].includes(currency) ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : maximumFractionDigits,
    minimumFractionDigits: compact ? 0 : maximumFractionDigits,
  }).format(convertedVal);
};
