import React from 'react'
import { useState } from 'react'

export function HeroLoading() {
    const [loadingGif] = useState(() => {
            const gifs = ['gojomoving.gif', 'gokufight.gif', 'gokufight2.gif'];
            return gifs[Math.floor(Math.random() * gifs.length)];
        });
    return (
        <div className='hero-loading'>
            <div className='loading-content'>
                <img src={`/${loadingGif}`} alt="Loading" className='loading-gif' />
                <h2 className='loading-title'>RANKOTAKU</h2>
                <div className='loading-bar'>
                    <div className='loading-progress'></div>
                </div>
                <p className='loading-text'>Preparing your anime experience...</p>
            </div>
        </div>
    )
}


