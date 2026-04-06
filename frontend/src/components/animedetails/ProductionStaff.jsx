import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductionStaff.css';

export const ProductionStaff = ({ anime }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const API = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${API}/api/jikan/anime/${anime.mal_id}/staff`);
        setStaff(response.data.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching staff:', error);
        setLoading(false);
      }
    };

    if (anime?.mal_id) {
      fetchStaff();
    }
  }, [anime?.mal_id]);

  const getStaffByPosition = (position) => {
    return staff.filter(member =>
      member.positions.some(pos => pos.toLowerCase().includes(position.toLowerCase()))
    );
  };

  const keyPositions = [
    { title: 'Director', key: 'director' },
    { title: 'Producer', key: 'producer' },
    { title: 'Music', key: 'music' },
    { title: 'Character Design', key: 'character design' }
  ];

  if (loading) {
    return (
      <div className="production-staff">
        <h2 className="section-title">Staff & Production</h2>
        <div className="staff-loading">Loading staff information...</div>
      </div>
    );
  }

  return (
    <div className="production-staff">
      <h2 className="section-title">Staff & Production</h2>

      {/* Studios */}
      {anime.studios && anime.studios.length > 0 && (
        <div className="studios-section">
          <h3>Studios</h3>
          <div className="studios-list">
            {anime.studios.map((studio, index) => (
              <span key={index} className="studio-tag">{studio.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Staff Grid */}
      <div className="staff-grid">
        {keyPositions.map(position => {
          const staffMembers = getStaffByPosition(position.key);
          if (staffMembers.length === 0) return null;

          return (
            <div key={position.key} className="staff-category">
              <h4>{position.title}</h4>
              <div className="staff-list">
                {staffMembers.slice(0, 3).map((member, index) => (
                  <div key={index} className="staff-member">
                    <div className="staff-photo">
                      {member.person.images?.jpg?.image_url ? (
                        <img
                          src={member.person.images.jpg.image_url}
                          alt={member.person.name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="staff-avatar-fallback">
                        {member.person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div className="staff-details">
                      <span className="staff-name">{member.person.name}</span>
                      <span className="staff-role">{member.positions[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Info */}
      <div className="production-info">
        {anime.source && (
          <div className="info-item">
            <span className="info-label">Source</span>
            <span className="info-value">{anime.source}</span>
          </div>
        )}
        {anime.producers && anime.producers.length > 0 && (
          <div className="info-item">
            <span className="info-label">Producers</span>
            <span className="info-value">
              {anime.producers.slice(0, 2).map(p => p.name).join(', ')}
              {anime.producers.length > 2 && ` +${anime.producers.length - 2} more`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};