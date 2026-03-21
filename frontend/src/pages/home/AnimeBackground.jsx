

export function AnimeBackground( {animeList , currentSlide}) {
    return (
        <div className='anime-background'>
            {animeList.map((anime, index) => (
                <div
                    key={index}
                    className={`anime-slide ${index === currentSlide ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${anime.image})` }}
                >
                    <div className='anime-overlay'></div>
                </div>
            ))}
        </div>
    )
}


