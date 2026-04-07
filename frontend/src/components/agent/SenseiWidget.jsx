import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/useAnimeQueries';
import './SenseiWidget.css';

export function SenseiWidget() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isTyping, isOpen]);

    // Initialize conversation when opened for the FIRST time
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Check if user has seen the disclaimer before
            const hasSeenDisclaimer = localStorage.getItem('pochita_disclaimer_seen');
            
            if (!hasSeenDisclaimer) {
                setShowDisclaimer(true);
                return;
            }
            
            initializeChat();
        }
    }, [isOpen]);

    const initializeChat = async () => {
        setIsTyping(true);
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                // Show a friendly greeting for non-logged-in users
                setMessages([{ 
                    role: 'assistant', 
                    content: 'Hello! I\'m Pochita, your anime assistant. I can recommend anime and answer your questions. For personalized features like managing your anime list, please log in! 🎌\n\nWhat kind of anime are you interested in?' 
                }]);
                setIsTyping(false);
                return;
            }
            
            const res = await api.get('/api/agent/init');
            
            setMessages([{ role: 'assistant', content: res.data.message }]);
        } catch (error) {
            console.error("Sensei init error:", error);
            // Friendly fallback message
            setMessages([{ 
                role: 'assistant', 
                content: 'Hello! I\'m Pochita, your anime assistant. I can help you discover great anime! What are you looking for today?' 
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleDisclaimerNext = () => {
        localStorage.setItem('pochita_disclaimer_seen', 'true');
        setShowDisclaimer(false);
        initializeChat();
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if(!input.trim()) return;

        const newHistory = [...messages, { role: 'user', content: input }];
        setMessages(newHistory);
        setInput("");
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setMessages([...newHistory, { 
                    role: 'assistant', 
                    content: 'Please log in to use this feature. I can still help with general anime recommendations!' 
                }]);
                setIsTyping(false);
                return;
            }
            
            const res = await api.post('/api/agent/chat', {
                message: input,
                chatHistory: messages.slice(-4)
            });
            
            const reply = res.data.reply;
            
            // Check if response has direct navigation data
            if (res.data.navigate) {
                setMessages([...newHistory, { 
                    role: 'assistant', 
                    content: reply
                }]);
                
                // Navigate immediately
                setTimeout(() => {
                    navigate(res.data.navigate);
                    setIsOpen(false);
                }, 800);
                setIsTyping(false);
                return;
            }
            
            // Fallback: Check if the reply contains a navigation command
            if (reply.includes('NAVIGATE:')) {
                const navMatch = reply.match(/NAVIGATE:(\/anime\/[^|]+)\|(.+)/);
                if (navMatch) {
                    const [, url, animeName] = navMatch;
                    setMessages([...newHistory, { 
                        role: 'assistant', 
                        content: `Redirecting you to **${animeName}** page... 🎌` 
                    }]);
                    
                    setTimeout(() => {
                        navigate(url);
                        setIsOpen(false);
                    }, 800);
                    setIsTyping(false);
                    return;
                }
            }
            
            setMessages([...newHistory, { role: 'assistant', content: reply }]);

            // If Pochita automated a list task, force React Query to instantly re-fetch the user's anime list
            if (res.data.listModified) {
                // Invalidate queries to refresh data without page reload
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANIME_LIST });
                queryClient.invalidateQueries({ queryKey: ['user-profile'] });
                queryClient.invalidateQueries({ queryKey: ['current-user'] });
                
                // Add a success message
                setTimeout(() => {
                    setMessages(prev => [...prev, { 
                        role: 'system', 
                        content: '✅ *Changes saved successfully!*' 
                    }]);
                }, 500);
            }
        } catch (e) {
            console.error(e);
            
            // Handle different error types
            let errorMsg = 'Sorry, I encountered an error. Please try again.';
            
            if (e.response?.status === 429) {
                errorMsg = 'I\'m currently experiencing high demand. Please try again in a few minutes. 🙏';
            } else if (e.response?.status === 401) {
                errorMsg = 'Please log in to use this feature. I can still help with general anime recommendations!';
            } else if (e.response?.data?.reply) {
                errorMsg = e.response.data.reply;
            }
            
            setMessages([...newHistory, { role: 'assistant', content: errorMsg }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="sensei-widget-container">
            {/* The Floating Action Button */}
            <div className={`sensei-fab-wrapper ${isOpen ? 'hidden' : ''}`}>
                <button 
                    className="sensei-fab"
                    onClick={() => { setIsOpen(true); }}
                >
                    <img src="/pochito.gif" alt="Pochita" className="pochito-avatar" />
                </button>
            </div>

            {/* The Chat Window */}
            <div className={`sensei-chat-window ${isOpen ? 'open' : ''}`}>
                <div className="sensei-window-header">
                    <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                </div>
                
                {showDisclaimer ? (
                    <div className="disclaimer-container">
                        <div className="disclaimer-content">
                            <img src="/pochito.gif" alt="Pochita" className="disclaimer-avatar" />
                            <h3>⚠️ Beta Assistant</h3>
                            <p>
                                Hi! I'm Pochita, your anime assistant. I'm still learning and in <strong>beginner level</strong>, 
                                so I might make mistakes sometimes.
                            </p>
                            <p>
                                Please read our conversation carefully and let me know if I misunderstand something. 
                                I'll do my best to help you!
                            </p>
                            <button className="disclaimer-btn" onClick={handleDisclaimerNext}>
                                Got it! Let's chat 🎌
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="sensei-chat-log window-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`widget-msg-wrapper ${msg.role}`}>
                            <div className="widget-msg-bubble">
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="widget-msg-wrapper assistant">
                            <div className="widget-msg-bubble typing">
                                <img src="/pochitotyping.gif" alt="Typing..." className="typing-gif" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                        </div>

                        <form className="widget-input-area" onSubmit={sendMessage}>
                            <input 
                                type="text"
                                value={input} 
                                onChange={e => setInput(e.target.value)} 
                                placeholder="Ask Sensei..."
                                autoFocus={isOpen}
                            />
                            <button type="submit" disabled={isTyping || !input.trim()}>
                                <i className='bx bx-send'></i>
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
