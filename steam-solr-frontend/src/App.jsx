import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [games, setGames] = useState([]);
  const [query, setQuery] = useState('');
  
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortMethod, setSortMethod] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [facets, setFacets] = useState({ categories: [], platforms: [] });
  const [loading, setLoading] = useState(false);

  const parseFacets = (facetArray) => {
    if (!facetArray) return [];
    const parsed = [];
    for (let i = 0; i < facetArray.length; i += 2) {
      parsed.push({ name: facetArray[i], count: facetArray[i + 1] });
    }
    return parsed;
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5000/api/autocomplete?q=${query}`);
        setSuggestions(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    
    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/search', {
        params: {
          q: query || '*:*',
          category: selectedCategory,
          platform: selectedPlatform,
          sort: sortMethod,
          page: page,
          rows: 12
        },
      });

      const data = response.data;
      
      const docsWithHighlights = data.response.docs.map(doc => {
        const highlight = data.highlighting[doc.id]?.name;
        return { ...doc, displayName: highlight ? highlight[0] : doc.name };
      });

      setGames(docsWithHighlights);
      setTotalPages(Math.ceil(data.response.numFound / 12));
      
      setFacets({
        categories: parseFacets(data.facet_counts.facet_fields.categories),
        platforms: parseFacets(data.facet_counts.facet_fields.platforms),
      });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchGames();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedCategory, selectedPlatform, sortMethod, page]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedCategory, selectedPlatform, sortMethod]);

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Steam Explorer</h1>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search games..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="search-bar"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="autocomplete-dropdown">
              {suggestions.map((sug, idx) => (
                <li key={idx} onClick={() => handleSuggestionClick(sug)}>{sug}</li>
              ))}
            </ul>
          )}
        </div>

        <select 
          className="sort-dropdown" 
          value={sortMethod} 
          onChange={(e) => setSortMethod(e.target.value)}
        >
          <option value="">Relevance</option>
          <option value="price asc">Price: Low to High</option>
          <option value="price desc">Price: High to Low</option>
          <option value="positive_ratings desc">Highest Rated</option>
        </select>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <h3>Categories</h3>
          <ul className="facet-list">
            <li className={!selectedCategory ? 'active' : ''} onClick={() => setSelectedCategory('')}>All Categories</li>
            {facets.categories.map((cat) => (
              <li key={cat.name} className={selectedCategory === cat.name ? 'active' : ''} onClick={() => setSelectedCategory(cat.name)}>
                {cat.name} <span className="count">({cat.count})</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="results-area">
          {loading ? <p>Querying Solr...</p> : (
            <>
              <div className="games-grid">
                {games.map((game) => (
                  <div key={game.id} className="game-card">
                    <h2 dangerouslySetInnerHTML={{ __html: game.displayName }}></h2>
                    <p><strong>Price:</strong> ${game.price === 0 ? 'Free' : game.price}</p>
                    <p><strong>Rating:</strong> {game.positive_ratings} Positive</p>
                    <div className="tags">
                      <p><strong>Genres:</strong> {game.genres?.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>


              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <span>Page {page} of {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;