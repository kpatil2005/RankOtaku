import React, { useState, useEffect } from 'react';
import { jikanAPI } from '../services/api';

const Episodes = ({ animeId }) => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);

  const fetchEpisodes = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (episodes.length > 0) {
      setShowEpisodes(!showEpisodes);
      return;
    }
    
    setLoading(true);
    try {
      const response = await jikanAPI.getAnimeEpisodes(animeId);
      setEpisodes(response.data.data);
      setShowEpisodes(true);
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <button 
        onClick={fetchEpisodes}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: '#ff6b35',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 10,
          position: 'relative'
        }}
      >
        {loading ? 'Loading...' : showEpisodes ? 'Hide Episodes' : 'Show Episodes'}
      </button>
      
      {showEpisodes && episodes.length > 0 && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            marginTop: '10px',
            background: '#1a1a1a',
            borderRadius: '4px',
            padding: '10px',
            zIndex: 10,
            position: 'relative'
          }}>
          {episodes.map((episode) => (
            <div key={episode.mal_id} style={{
              padding: '8px 0',
              borderBottom: '1px solid #333',
              color: '#fff'
            }}>
              <div><strong>Ep {episode.mal_id}:</strong> {episode.title}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <a href={`https://www.crunchyroll.com/search?q=${encodeURIComponent(episode.title)}`} 
                   target="_blank" rel="noopener noreferrer" 
                   style={{ color: '#ff6b35', marginRight: '10px' }}>Crunchyroll</a>
                <a href={`https://www.funimation.com/search/?q=${encodeURIComponent(episode.title)}`} 
                   target="_blank" rel="noopener noreferrer" 
                   style={{ color: '#ff6b35', marginRight: '10px' }}>Funimation</a>
                <a href={`https://www.netflix.com/search?q=${encodeURIComponent(episode.title)}`} 
                   target="_blank" rel="noopener noreferrer" 
                   style={{ color: '#ff6b35' }}>Netflix</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Episodes;