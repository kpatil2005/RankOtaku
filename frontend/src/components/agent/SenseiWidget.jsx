import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/useAnimeQueries';
import './SenseiWidget.css';

// ─── Check support safely (some bundlers evaluate modules outside browser) ──
function getVoiceSupport() {
    try {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    } catch (_) {
        return false;
    }
}
function getSRClass() {
    try {
        return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    } catch (_) {
        return null;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
export function SenseiWidget() {
    const queryClient = useQueryClient();
    const navigate    = useNavigate();

    /* UI state */
    const [isOpen,         setIsOpen]        = useState(false);
    const [input,          setInput]          = useState('');
    const [messages,       setMessages]       = useState([]);
    const [isTyping,       setIsTyping]       = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [isListening,    setIsListening]    = useState(false);
    const [transcript,     setTranscript]     = useState('');
    const [voiceError,     setVoiceError]     = useState('');

    /* Refs — safe in async callbacks, never stale */
    const bottomRef      = useRef(null);
    const messagesRef    = useRef([]);
    const isTypingRef    = useRef(false);
    const micRef         = useRef(null);   // current chat SpeechRecognition
    const wakeRef        = useRef(null);   // current wake SpeechRecognition
    const wakeAlive      = useRef(false);
    const isOpenRef      = useRef(false);
    const openByWake     = useRef(false);
    const sendRef        = useRef(null);   // always-current pointer to handleSend
    const permGranted    = useRef(false);  // has mic permission been explicitly granted?

    /* Sync refs with state */
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);
    useEffect(() => { isOpenRef.current   = isOpen;   }, [isOpen]);

    /* Scroll to bottom */
    useEffect(() => {
        if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isOpen]);

    // ══════════════════════════════════════════════════════════════════════════
    //  SEND  – defined first so sendRef can always point to the latest version
    // ══════════════════════════════════════════════════════════════════════════
    const handleSend = useCallback(async (textArg) => {
        const text = (typeof textArg === 'string' ? textArg : input).trim();
        if (!text || isTypingRef.current) return;

        // stop mic if running
        if (micRef.current) {
            try { micRef.current.abort(); } catch (_) {}
            micRef.current = null;
        }
        setIsListening(false);
        setTranscript('');
        setInput('');

        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Please log in for personalized features. I can still answer general anime questions!',
                }]);
                return;
            }
            const res = await api.post('/api/agent/chat', {
                message: text,
                chatHistory: messagesRef.current.slice(-6),
            });
            const reply = res.data.reply;

            if (res.data.navigate) {
                setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
                setTimeout(() => { navigate(res.data.navigate); setIsOpen(false); }, 900);
                return;
            }
            if (reply?.includes('NAVIGATE:')) {
                const m = reply.match(/NAVIGATE:(\/anime\/[^|]+)\|(.+)/);
                if (m) {
                    setMessages(prev => [...prev, { role: 'assistant', content: `Redirecting to **${m[2]}**… 🎌` }]);
                    setTimeout(() => { navigate(m[1]); setIsOpen(false); }, 900);
                    return;
                }
            }
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            if (res.data.listModified) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANIME_LIST });
                queryClient.invalidateQueries({ queryKey: ['user-profile'] });
                queryClient.invalidateQueries({ queryKey: ['current-user'] });
                setTimeout(() => setMessages(prev => [...prev, { role: 'system', content: '✅ *Changes saved!*' }]), 500);
            }
        } catch (e) {
            let msg = 'Something went wrong. Please try again.';
            if (e.response?.status === 429) msg = 'High demand – please wait a moment 🙏';
            else if (e.response?.status === 401) msg = 'Please log in to use this feature!';
            else if (e.response?.data?.reply) msg = e.response.data.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
        } finally {
            setIsTyping(false);
        }
    }, [input, navigate, queryClient]);

    // Always keep sendRef current so recognition callbacks call the right version
    useEffect(() => { sendRef.current = handleSend; }, [handleSend]);

    // ══════════════════════════════════════════════════════════════════════════
    //  MIC  — explicit permission first, then recognition
    // ══════════════════════════════════════════════════════════════════════════
    const stopMic = useCallback(() => {
        if (micRef.current) {
            try { micRef.current.abort(); } catch (_) {}
            micRef.current = null;
        }
        setIsListening(false);
        setTranscript('');
    }, []);

    const startMic = useCallback(async () => {
        if (!getVoiceSupport()) {
            setVoiceError('Voice input not supported. Please use Chrome or Edge.');
            return;
        }
        // Toggle off if already listening
        if (micRef.current) { stopMic(); return; }

        setVoiceError('');
        setTranscript('');

        // ── Check permission state first (non-intrusive) ──────────────────────
        if (navigator.permissions) {
            try {
                const status = await navigator.permissions.query({ name: 'microphone' });
                if (status.state === 'denied') {
                    setVoiceError('DENIED');
                    return;
                }
                if (status.state === 'granted') {
                    permGranted.current = true;
                    if (!wakeRef.current) startWake();
                }
            } catch (_) { /* older browsers may not support this, continue anyway */ }
        }

        // ── Start SpeechRecognition directly (it handles its own permission prompt) ──
        const SR = getSRClass();
        if (!SR) return;
        const r = new SR();
        r.lang           = 'en-US';
        r.continuous     = false;
        r.interimResults = true;

        let finalText   = '';
        let interimText = '';

        r.onstart = () => {
            setIsListening(true);
            finalText   = '';
            interimText = '';
            console.log('[Mic] ✅ Started');
        };

        r.onresult = (evt) => {
            let interim = '';
            for (let i = evt.resultIndex; i < evt.results.length; i++) {
                const result = evt.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }
            interimText = interim;
            const display = (finalText + interim).trim();
            setTranscript(display);
            setInput(display);
            console.log('[Mic] 🎤 Result:', display);
        };

        r.onend = () => {
            micRef.current = null;
            setIsListening(false);
            // Use finalText first, then bestInterim — this handles Chrome not setting isFinal
            const captured = (finalText || interimText).trim();
            console.log('[Mic] 🔴 End. Captured:', captured);
            if (captured) {
                setTranscript('');
                // Use ref to avoid stale closure — critical!
                setTimeout(() => sendRef.current?.(captured), 300);
            } else {
                setTranscript('');
                setInput('');
            }
        };

        r.onerror = (evt) => {
            micRef.current = null;
            setIsListening(false);
            setTranscript('');
            console.error('[Mic] ❌ Error:', evt.error);
            if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
                setVoiceError('Mic blocked! Click the 🔒 in your browser address bar → allow Microphone.');
            } else if (evt.error === 'network') {
                setVoiceError('Network error. Speech recognition needs an internet connection.');
            } else if (evt.error !== 'no-speech' && evt.error !== 'aborted') {
                setVoiceError(`Voice error (${evt.error}). Click mic to try again.`);
            }
        };

        try {
            r.start();
            micRef.current = r;
        } catch (err) {
            console.error('[Mic] Could not start:', err);
            setIsListening(false);
            setVoiceError('Could not start mic. Please refresh and try again.');
        }
    }, [stopMic]);

    // ══════════════════════════════════════════════════════════════════════════
    //  WAKE WORD  ("Hey Pochita" / "Pochita")
    // ══════════════════════════════════════════════════════════════════════════
    const stopWake = useCallback(() => {
        wakeAlive.current = false;
        if (wakeRef.current) {
            try { wakeRef.current.abort(); } catch (_) {}
            wakeRef.current = null;
        }
    }, []);

    const startWake = useCallback(() => {
        if (!getVoiceSupport()) return;
        stopWake();
        const SR = getSRClass();
        if (!SR) return;
        const r = new SR();
        r.lang           = 'en-US';
        r.continuous     = true;
        r.interimResults = false;

        r.onresult = (evt) => {
            for (let i = evt.resultIndex; i < evt.results.length; i++) {
                if (!evt.results[i].isFinal) continue;
                const said = evt.results[i][0].transcript.toLowerCase().trim();
                console.log('[Wake] 👂', said);
                // Matches "pochita", "pochito", "hay pochita", etc.
                if (said.includes('pochit')) {
                    openByWake.current = true;
                    setIsOpen(true);
                }
            }
        };

        r.onend = () => {
            if (wakeAlive.current && !isOpenRef.current) {
                setTimeout(() => {
                    if (wakeAlive.current && !isOpenRef.current && wakeRef.current) {
                        try { wakeRef.current.start(); } catch (_) {}
                    }
                }, 300);
            }
        };

        r.onerror = (evt) => {
            console.log('[Wake] error:', evt.error);
            // If Chrome completely blocks us, we pause for a bit but don't kill wakeAlive.
            // We want it to try reviving later (e.g. if the user later clicks the mic).
            if (evt.error === 'not-allowed') {
                setTimeout(() => {
                    if (wakeAlive.current && !isOpenRef.current && wakeRef.current) {
                         try { wakeRef.current.start(); } catch (_) {}
                    }
                }, 5000); // Retry after 5s silently
            }
        };

        wakeAlive.current = true;
        try { r.start(); } catch (_) {}
        wakeRef.current = r;
    }, [stopWake]);

    /* Orchestrate wake vs open — start wake word automatically on load */
    useEffect(() => {
        if (!getVoiceSupport()) return;
        if (isOpen) {
            stopWake();
        } else {
            startWake();
        }
    }, [isOpen, startWake, stopWake]);

    /* Global user gesture unlock for Chrome's microphone policy */
    const gestureUnlock = useRef(false);
    useEffect(() => {
        const unlockVoice = () => {
            if (gestureUnlock.current || isOpen) return;
            gestureUnlock.current = true;
            console.log('[Wake] User gesture detected, waking up background listener...');
            startWake();
        };
        // Any click on the page counts as a gesture
        document.addEventListener('click', unlockVoice, { once: true });
        return () => document.removeEventListener('click', unlockVoice);
    }, [isOpen, startWake]);

    /* Auto-start mic on wake-word open */
    const prevOpen = useRef(false);
    useEffect(() => {
        const justOpened = isOpen && !prevOpen.current;
        prevOpen.current = isOpen;
        if (justOpened && openByWake.current && !showDisclaimer && getVoiceSupport()) {
            openByWake.current = false;
            const t = setTimeout(() => startMic(), 900);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, showDisclaimer]);

    /* Cleanup */
    useEffect(() => () => { stopWake(); stopMic(); }, [stopWake, stopMic]);

    // ══════════════════════════════════════════════════════════════════════════
    //  INIT / DISCLAIMER
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            if (!localStorage.getItem('pochita_disclaimer_seen')) {
                setShowDisclaimer(true);
            } else {
                initChat();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const initChat = async () => {
        setIsTyping(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setMessages([{ role: 'assistant', content: "Hello! I'm Pochita 🐾 your anime assistant. Log in for personalized features, or ask me anything!" }]);
                return;
            }
            const res = await api.get('/api/agent/init');
            setMessages([{ role: 'assistant', content: res.data.message }]);
        } catch {
            setMessages([{ role: 'assistant', content: "Hello! I'm Pochita, your anime assistant. What are you looking for today?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleDisclaimerNext = () => {
        localStorage.setItem('pochita_disclaimer_seen', 'true');
        setShowDisclaimer(false);
        initChat();
    };

    const handleClose  = () => { stopMic(); setIsOpen(false); };
    const toggleMic    = () => { micRef.current ? stopMic() : startMic(); };
    const onFormSubmit = (e) => { e.preventDefault(); handleSend(input); };

    // ══════════════════════════════════════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="sensei-widget-container">

            {/* ── FAB ─────────────────────────────────────────────── */}
            <div className={`sensei-fab-wrapper ${isOpen ? 'hidden' : ''}`}>
                {getVoiceSupport() && (
                    <div className="wake-word-pill">
                        <span className="wake-pulse" />
                        <span>Say "Hey Pochita"</span>
                    </div>
                )}
                <button
                    id="pochita-open-btn"
                    className="sensei-fab"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Pochita"
                >
                    <img src="/pochito.gif" alt="Pochita" className="pochito-avatar" />
                </button>
            </div>

            {/* ── Chat window ─────────────────────────────────────── */}
            <div className={`sensei-chat-window ${isOpen ? 'open' : ''}`}>
                <div className="sensei-window-header">
                    <div className="header-left">
                        <img src="/pochito.gif" alt="Pochita" className="header-avatar" />
                        <div className="header-info">
                            <div className="header-name">Pochita</div>
                            <div className={`header-status ${isListening ? 'header-status--listening' : 'header-status--online'}`}>
                                <span className="status-dot" />
                                {isListening ? '🎙️ Listening…' : 'Anime Assistant'}
                            </div>
                        </div>
                    </div>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                {showDisclaimer ? (
                    <div className="disclaimer-container">
                        <div className="disclaimer-content">
                            <img src="/pochito.gif" alt="Pochita" className="disclaimer-avatar" />
                            <h3>⚠️ Beta Assistant</h3>
                            <p>Hi! I'm Pochita, your anime assistant. I'm still in <strong>beta</strong>, so I might make mistakes.</p>
                            <p>Please correct me if needed. I'll do my best!</p>
                            <button className="disclaimer-btn" onClick={handleDisclaimerNext}>Got it! Let's chat 🎌</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="sensei-chat-log window-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`widget-msg-wrapper ${msg.role}`}>
                                    <div className="widget-msg-bubble">
                                        {msg.role === 'assistant'
                                            ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            : <p>{msg.content}</p>}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="widget-msg-wrapper assistant">
                                    <div className="widget-msg-bubble typing">
                                        <img src="/pochitotyping.gif" alt="Typing…" className="typing-gif" />
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Live transcript while speaking */}
                        {isListening && (
                            <div className="live-transcript">
                                <span className="transcript-dot" />
                                <span>{transcript || 'Waiting for speech…'}</span>
                            </div>
                        )}

                        {/* Error / Permission banner */}
                        {voiceError && (
                            voiceError === 'DENIED'
                            ? (
                                <div className="voice-perm-banner">
                                    <span>🔒 Microphone is blocked for this site.</span>
                                    <div className="voice-perm-steps">
                                        <span>1. Click the 🔒 icon in Chrome's address bar</span>
                                        <span>2. Set <b>Microphone</b> → <b>Allow</b></span>
                                        <span>3. Press the button below to reload</span>
                                    </div>
                                    <button className="perm-refresh-btn" onClick={() => window.location.reload()}>
                                        🔄 Reload &amp; Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className="voice-error-banner" onClick={() => setVoiceError('')}>
                                    🔇 {voiceError} <small>(tap to dismiss)</small>
                                </div>
                            )
                        )}

                        <form className="widget-input-area" onSubmit={onFormSubmit}>
                            {/* Mic button — always shown if browser supports it */}
                            {getVoiceSupport() && (
                                <button
                                    type="button"
                                    id="pochita-mic-btn"
                                    className={`mic-btn ${isListening ? 'mic-btn--active' : ''}`}
                                    onClick={toggleMic}
                                    title={isListening ? 'Stop' : 'Speak to Pochita'}
                                >
                                    <i className={`bx ${isListening ? 'bxs-microphone' : 'bx-microphone'}`} />
                                </button>
                            )}
                            <input
                                id="pochita-chat-input"
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
                                placeholder={isListening ? '🎙️ Speak now…' : 'Ask Pochita…'}
                                className={isListening ? 'input-listening' : ''}
                                disabled={isTyping}
                                autoComplete="off"
                            />
                            <button
                                id="pochita-send-btn"
                                type="submit"
                                disabled={isTyping || !input.trim()}
                            >
                                <i className="bx bx-send" />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
