import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
            const initSensei = async () => {
                setIsTyping(true);
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        setMessages([{ role: 'assistant', content: 'You must log in to speak with the Sensei.' }]);
                        setIsTyping(false);
                        return;
                    }
                    
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/agent/init`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    setMessages([{ role: 'assistant', content: res.data.message }]);
                } catch (error) {
                    console.error("Sensei init error:", error);
                    setMessages([{ role: 'assistant', content: 'My connection to the psychic plane is severed.' }]);
                } finally {
                    setIsTyping(false);
                }
            };
            initSensei();
        }
    }, [isOpen]); // only trigger when opened

    const sendMessage = async (e) => {
        e.preventDefault();
        if(!input.trim()) return;

        const newHistory = [...messages, { role: 'user', content: input }];
        setMessages(newHistory);
        setInput("");
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            if(!token) throw new Error("No Token");
            
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/agent/chat`, {
                message: input,
                chatHistory: messages.slice(-4)
            }, { headers: { Authorization: `Bearer ${token}` }});
            
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
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ANIME_LIST });
                // Also invalidate user profile data to refresh bio changes
                queryClient.invalidateQueries({ queryKey: ['user-profile'] });
                queryClient.invalidateQueries({ queryKey: ['current-user'] });
                
                // Force a page reload to show bio changes immediately
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
                // Add a system message to confirm the update
                setTimeout(() => {
                    setMessages(prev => [...prev, { 
                        role: 'system', 
                        content: '✅ *Profile updated! Refreshing page...*' 
                    }]);
                }, 500);
            }
        } catch (e) {
            console.error(e);
            setMessages([...newHistory, { role: 'assistant', content: '*(Sighs)* Your weak spiritual energy broke my connection. Please log in.' }]);
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
                    <img src="/pochito.png" alt="Pochita" className="pochito-avatar" />
                </button>
            </div>

            {/* The Chat Window */}
            <div className={`sensei-chat-window ${isOpen ? 'open' : ''}`}>
                <div className="sensei-window-header">
                    <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                </div>
                
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
                                <span>.</span><span>.</span><span>.</span>
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
            </div>
        </div>
    );
}
