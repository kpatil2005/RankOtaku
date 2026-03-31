

export function AnimeBackground( {animeList , currentSlide}) {
    return (
        <div className='anime-background'>
            {animeList.map((anime, index) => (
                <div
                    key={index}
                    className={`anime-slide ${index === currentSlide ? 'active' : ''}`}
                >
                    <img
                        src={anime.image}
                        alt="Anime background"
                        className="anime-bg-image"
                        loading={index === 0 ? "eager" : "lazy"}
                    />
                    <div className='anime-overlay'></div>
                </div>
            ))}
        </div>
    )
}


