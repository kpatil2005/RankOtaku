import React from 'react';
import './ProductionStaff.css';

/**
 * ProductionStaff now receives staff data as a prop from AnimeDetails
 * (already fetched via AniList getAnimeDetails). No additional API calls needed.
 */
export const ProductionStaff = ({ anime, staff = [] }) => {
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

  // Show section only if there's something to display
  const hasStaff = staff.length > 0;
  const hasStudios = anime?.studios && anime.studios.length > 0;
  const hasProducers = anime?.producers && anime.producers.length > 0;
  const hasSource = !!anime?.source;

  if (!hasStaff && !hasStudios && !hasProducers && !hasSource) return null;

  return (
    <div className="production-staff">
      <h2 className="section-title">Staff & Production</h2>

      {/* Studios */}
      {hasStudios && (
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
      {hasStaff && (
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
      )}

      {/* Production Info */}
      <div className="production-info">
        {hasSource && (
          <div className="info-item">
            <span className="info-label">Source</span>
            <span className="info-value">{anime.source}</span>
          </div>
        )}
        {hasProducers && (
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
