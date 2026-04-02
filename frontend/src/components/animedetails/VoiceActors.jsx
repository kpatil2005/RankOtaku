import React from 'react';
import './VoiceActors.css';

export const VoiceActors = ({ characters }) => {
  // Filter characters that have voice actors
  const charactersWithVA = characters.filter(char => 
    char.voice_actors && char.voice_actors.length > 0
  );

  const getJapaneseVA = (voiceActors) => {
    return voiceActors.find(va => va.language === 'Japanese');
  };

  const getEnglishVA = (voiceActors) => {
    return voiceActors.find(va => va.language === 'English');
  };

  if (charactersWithVA.length === 0) {
    return (
      <div className="voice-actors">
        <h2 className="section-title">Voice Actors</h2>
        <p className="no-va-message">Voice actor information not available</p>
      </div>
    );
  }

  return (
    <div className="voice-actors">
      <h2 className="section-title">Voice Actors</h2>
      
      <div className="va-grid">
        {charactersWithVA.slice(0, 12).map((char, index) => {
          const japaneseVA = getJapaneseVA(char.voice_actors);
          const englishVA = getEnglishVA(char.voice_actors);

          return (
            <div key={index} className="va-card">
              {/* Character Info */}
              <div className="character-section">
                <div className="character-photo">
                  <img 
                    src={char.character.images?.jpg?.image_url} 
                    alt={char.character.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="character-avatar-fallback">
                    {char.character.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                </div>
                <div className="character-info">
                  <div className="character-name">{char.character.name}</div>
                  <div className="character-role">{char.role}</div>
                </div>
              </div>

              {/* Voice Actors */}
              <div className="va-section">
                {japaneseVA && (
                  <div className="va-info">
                    <div className="va-photo">
                      <img 
                        src={japaneseVA.person.images?.jpg?.image_url} 
                        alt={japaneseVA.person.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="va-avatar-fallback">
                        {japaneseVA.person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div className="va-details">
                      <span className="va-name">{japaneseVA.person.name}</span>
                      <span className="va-language">Japanese</span>
                    </div>
                  </div>
                )}

                {englishVA && (
                  <div className="va-info">
                    <div className="va-photo">
                      <img 
                        src={englishVA.person.images?.jpg?.image_url} 
                        alt={englishVA.person.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="va-avatar-fallback">
                        {englishVA.person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div className="va-details">
                      <span className="va-name">{englishVA.person.name}</span>
                      <span className="va-language">English</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {charactersWithVA.length > 12 && (
        <div className="va-show-more">
          <p>Showing 12 of {charactersWithVA.length} characters with voice actors</p>
        </div>
      )}
    </div>
  );
};