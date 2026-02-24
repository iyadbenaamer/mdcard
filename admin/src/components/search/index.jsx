import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";

import axiosClient from "utils/AxiosClient";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get("query") || "");
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [lastHoveredIndex, setLastHoveredIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const searchBarRef = useRef(null);

  const query = searchParams.get("query") || "";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        !searchBarRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search results when query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data } = await axiosClient(
          `/search?query=${encodeURIComponent(query)}`,
        );
        setSearchResults(data);
        setHasSearched(true);
      } catch (error) {
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  // Update input value when selectedIndex changes
  useEffect(() => {
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      setInputValue(suggestions[selectedIndex]);
    }
  }, [selectedIndex, suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchSubmit(inputValue);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearchSubmit(inputValue);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Fetch suggestions when typing
  const handleSearchChange = async (value) => {
    if (value.length > 1000) return; // Limit input length
    setInputValue(value);
    setSelectedIndex(-1); // Reset selectedIndex when typing

    if (!value.trim()) {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    try {
      const { data } = await axiosClient(
        `/search/suggest?text=${encodeURIComponent(value)}`,
      );
      // Always put user's input at the top of suggestions
      const suggestions = [value, ...data.filter((s) => s !== value)];
      setSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      setSuggestions(value ? [value] : []); // Show user's input if it exists
      setShowSuggestions(true);
    }
  };

  const handleFocus = () => {
    // Only fetch suggestions if there's text in the input
    if (inputValue.trim()) {
      handleSearchChange(inputValue);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setSearchParams({ query: suggestion });
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSearchSubmit = (value) => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchParams({ query: value });
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSuggestionHover = (index) => {
    if (index !== lastHoveredIndex) {
      setSelectedIndex(index);
      setLastHoveredIndex(index);
    }
  };

  return (
    <div className="my-0 mx-auto px-3">
      <div className="flex flex-col gap-4">
        <div className="relative" ref={searchBarRef}>
          <SearchBar
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onSubmit={handleSearchSubmit}
            onClear={() => {
              setInputValue("");
              setShowSuggestions(false);
              setSelectedIndex(-1);
              setLastHoveredIndex(-1);
              setHasSearched(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-30"
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => handleSuggestionHover(index)}
                  className={`w-full px-4 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg text-ellipsis overflow-clip text-wrap`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            Loading...
          </div>
        ) : (
          <SearchResults results={searchResults} hasSearched={hasSearched} />
        )}
      </div>
    </div>
  );
};

export default Search;
