import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../header/Header';
import './CharacterSelection.css';

export function CharacterSelection() {
    const location = useLocation();
    const navigate = useNavigate();
    const { characters, animeTitle, animeImage, animeId, completedCharacters } = location.state || {};

    if (!characters || characters.length === 0) {
        return (
            <>
                <Header />
                <div className="character-selection-container">
                    <h1>No Characters Available</h1>
                    <button onClick={() => navigate(-1)} className="back-btn">Go Back</button>
                </div>
            </>
        );
    }

    const handleCharacterSelect = (character) => {
        navigate('/character-quiz', {
            state: {
                character: character.character,
                animeTitle,
                animeImage,
                animeId,
                completedCharacters
            }
        });
    };

    return (
        <>
            <Header />
            <div className="character-selection-container">
                <button onClick={() => navigate(-1)} className="back-to-anime-btn-top">
                    ← Back to Anime Details
                </button>
                
                <div className="character-selection-header">
                    <h1>Select a Character</h1>
                    <p>Choose a character to start the quiz</p>
                </div>
                
                <div className="characters-selection-grid">
                    {characters.map((char, index) => (
                        <div 
                            key={index} 
                            className="character-selection-card"
                            onClick={() => handleCharacterSelect(char)}
                        >
                            <img src={char.character.images.jpg.image_url} alt={char.character.name} />
                            <div className="character-selection-info">
                                <h3>{char.character.name}</h3>
                                <p>{char.role}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={() => navigate(-1)} className="back-to-anime-btn">
                    Back to Anime Details
                </button>
            </div>
        </>
    );
}
