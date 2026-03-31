import React from 'react'
import axios from 'axios';
import { Anime } from './anime';

// Move constants outside component (never change)
const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'top', label: 'Top Rated' },
    { id: 'trending', label: 'Trending' },
    { id: 'airing', label: 'Airing' },
    { id: 'movies', label: 'Movies' }
];

const SEARCH_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'tv', label: 'TV' },
    { id: 'movie', label: 'Movies' },
    { id: 'airing', label: 'Airing' }
];

const MemoizedAnime = React.memo(Anime);


export function Search({ onCategoryChange, onSearchStateChange }) {
    const [searchState, setSearchState] = React.useState({
        term: '',
        results: [],
        isSearching: false
    });
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [searchFilter, setSearchFilter] = React.useState('all');

    // Global search function with useCallback
    const performGlobalSearch = React.useCallback(async (query, filter = 'all', signal) => {
        if (!query.trim()) {
            setSearchState(prev => ({
                ...prev,
                results: [],
                isSearching: false
            }));
            return;
        }

        setSearchState(prev => ({ ...prev, isSearching: true }));

        try {
            let url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`;

            // Add filter parameters
            if (filter === 'tv') url += '&type=tv';
            if (filter === 'movie') url += '&type=movie';
            if (filter === 'airing') url += '&status=airing';

            const response = await axios.get(url, { signal });
            setSearchState(prev => ({
                ...prev,
                results: response.data.data || [],
                isSearching: false
            }));
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Search error:', error);
                setSearchState(prev => ({
                    ...prev,
                    results: [],
                    isSearching: false
                }));
            }
        }
    }, []);

    // Debounced search with AbortController
    React.useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            if (searchState.term) {
                performGlobalSearch(searchState.term, searchFilter, controller.signal);
            } else {
                setSearchState(prev => ({
                    ...prev,
                    results: [],
                    isSearching: false
                }));
            }
        }, 500);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [searchState.term, searchFilter, performGlobalSearch]);

    // Notify parent about category changes
    React.useEffect(() => {
        onCategoryChange?.(activeCategory);
    }, [activeCategory, onCategoryChange]);

    // Notify parent about search state
    React.useEffect(() => {
        onSearchStateChange?.({
            isSearching: !!searchState.term,
            searchTerm: searchState.term,
            searchFilter
        });
    }, [searchState.term, searchFilter, onSearchStateChange]);

    // Memoize filter buttons
    const filterButtons = React.useMemo(() => (
        SEARCH_FILTERS.map(filter => (
            <button
                key={filter.id}
                onClick={() => setSearchFilter(filter.id)}
                className={`search-filter-btn ${searchFilter === filter.id ? 'active' : ''}`}
            >
                {filter.label}
            </button>
        ))
    ), [searchFilter]);

    // Memoize category buttons
    const categoryButtons = React.useMemo(() => (
        CATEGORIES.map(cat => (
            <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
            >
                {cat.label}
            </button>
        ))
    ), [activeCategory]);

    // Memoize search result title
    const searchResultTitle = React.useMemo(() => {
        const filterLabel = searchFilter !== 'all'
            ? `(${SEARCH_FILTERS.find(f => f.id === searchFilter)?.label})`
            : '';
        return `Search Results for "${searchState.term}" ${filterLabel}`;
    }, [searchState.term, searchFilter]);

    return (
        <>
            <div className="arena-header">
                <h1 className="arena-title">ANIME ARENA</h1>
                <p className="arena-subtitle">Test Your Knowledge, Prove Your Mastery</p>
            </div>
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search anime globally..."
                    value={searchState.term}
                    onChange={(e) => setSearchState(prev => ({ ...prev, term: e.target.value }))}
                    className="global-search"
                />
                {searchState.term && (
                    <div className="search-filters">
                        <span className="filter-label">Filter:</span>
                        {filterButtons}
                    </div>
                )}
                {!searchState.term && (
                    <div className="category-filters">
                        {categoryButtons}
                    </div>
                )}
            </div>

            <hr className="section-divider" />

            {/* Show search results when searching */}
            {searchState.term && (
                <>
                    {searchState.isSearching && (
                        <div className="search-loading">
                            <p>🔍 Searching globally...</p>
                        </div>
                    )}
                    {!searchState.isSearching && searchState.results.length > 0 && (
                        <MemoizedAnime
                            anime={searchState.results}
                            title={searchResultTitle}
                        />
                    )}
                    {!searchState.isSearching && searchState.results.length === 0 && searchState.term && (
                        <div className="no-results">
                            <p>No results found for "{searchState.term}"</p>
                        </div>
                    )}
                </>
            )}
        </>
    )
}
