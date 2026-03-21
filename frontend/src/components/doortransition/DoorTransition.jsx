import React, { useState, useEffect } from 'react'
import './DoorTransition.css'

export function DoorTransition({ onComplete }) {
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        setTimeout(() => setClosing(true), 50);
        
        const closeTimer = setTimeout(() => {
            setClosing(false);
        }, 900);
        
        const completeTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 1800);

        return () => {
            clearTimeout(closeTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className="door-transition">
            <div className={`door door-left ${closing ? 'close' : ''}`}>
                <img src="/door2.jpg" alt="Door Left" />
            </div>
            <div className={`door door-right ${closing ? 'close' : ''}`}>
                <img src="/door1.jpg" alt="Door Right" />
            </div>
        </div>
    );
}
