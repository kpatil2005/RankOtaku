import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './SenseiPage.css';

const SenseiPage = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Initialize conversation
    useEffect(() => {
        const initSensei = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setMessages([{ role: 'assistant', content: 'You must be logged in to speak with me. Return when you have Awakened.' }]);
                    setIsTyping(false);
                    return;
                }
                
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/agent/init`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setMessages([{ role: 'assistant', content: res.data.message }]);
            } catch (error) {
                console.error("Sensei init error:", error);
                setMessages([{ role: 'assistant', content: 'My connection to the psychic plane is severed. (Error connecting to Sensei)' }]);
            } finally {
                setIsTyping(false);
            }
        };
        initSensei();
    }, []);

    const sendMessage = async (e) => {
        e.preventDefault();
        if(!input.trim()) return;

        const newHistory = [...messages, { role: 'user', content: input }];
        setMessages(newHistory);
        setInput("");
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/agent/chat`, {
                message: input,
                // Only send the last 4 messages to avoid massive token usage
                chatHistory: messages.slice(-4)
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            setMessages([...newHistory, { role: 'assistant', content: res.data.reply }]);
        } catch (e) {
            console.error(e);
            setMessages([...newHistory, { role: 'assistant', content: '*(Sighs)* Your weak spiritual energy broke my connection. Try again.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="sensei-page">
            <div className="sensei-container">
                <div className="sensei-header">
                    <div className="sensei-avatar">
                        <i className='bx bx-ghost'></i>
                    </div>
                    <h2>RankOtaku Sensei</h2>
                    <p>The Omniscient Anime Guide</p>
                </div>
                
                <div className="chat-log window-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`msg-wrapper ${msg.role}`}>
                            <div className="msg-bubble">
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="msg-wrapper assistant">
                            <div className="msg-bubble typing">
                                <span>.</span><span>.</span><span>.</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={sendMessage}>
                    <input 
                        type="text"
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="Ask for recommendations, stats, or anime trivia..."
                        autoFocus
                    />
                    <button type="submit" className="btn" disabled={isTyping || !input.trim()}>
                        <i className='bx bx-send'></i>
                        Ask
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SenseiPage;
