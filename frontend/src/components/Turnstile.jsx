import { useEffect, useRef } from 'react';

const Turnstile = ({ onVerify, onError, onExpire }) => {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const scriptLoadedRef = useRef(false);

    useEffect(() => {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="turnstile"]');
        
        if (existingScript) {
            // Script already loaded, just render widget
            if (window.turnstile && containerRef.current && !widgetIdRef.current) {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
                    callback: (token) => {
                        onVerify(token);
                    },
                    'error-callback': () => {
                        if (onError) onError();
                    },
                    'expired-callback': () => {
                        if (onExpire) onExpire();
                    },
                    theme: 'dark',
                });
            }
            return;
        }

        // Load Turnstile script
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            scriptLoadedRef.current = true;
            if (window.turnstile && containerRef.current && !widgetIdRef.current) {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
                    callback: (token) => {
                        onVerify(token);
                    },
                    'error-callback': () => {
                        if (onError) onError();
                    },
                    'expired-callback': () => {
                        if (onExpire) onExpire();
                    },
                    theme: 'dark',
                });
            }
        };

        script.onerror = () => {
            console.error('Failed to load Turnstile script');
            if (onError) onError();
        };

        document.body.appendChild(script);

        return () => {
            if (widgetIdRef.current !== null && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                    widgetIdRef.current = null;
                } catch (e) {
                    console.error('Error removing Turnstile widget:', e);
                }
            }
        };
    }, [onVerify, onError, onExpire]);

    return <div ref={containerRef} style={{ marginBottom: '20px', minHeight: '65px' }}></div>;
};

export default Turnstile;
