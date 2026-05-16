let exchangeRates: Record<string, number> = {
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

export const fetchExchangeRates = async () => {
  try {
    // Using Frankfurter API (free, no key required)
    const response = await fetch('https://api.frankfurter.app/latest?from=PKR');
    const data = await response.json();
    if (data && data.rates) {
      exchangeRates = { ...exchangeRates, ...data.rates, 'PKR': 1 };
      return true;
    }
  } catch (error) {
    console.error('Failed to fetch live exchange rates, using mocks:', error);
  }
  return false;
};

// Initial fetch attempt
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
