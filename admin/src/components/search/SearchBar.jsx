import SearchIcon from "assets/icons/search.svg?react";
import CrossIcon from "assets/icons/cross.svg?react";

const SearchBar = ({
  value,
  onChange,
  onSubmit,
  onClear,
  onKeyDown,
  onFocus,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(value);
  };

  const handleKeyDown = (e) => {
    // Only prevent default for navigation keys
    if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
      e.preventDefault();
    }
    onKeyDown(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 my-1 px-3 rounded-3xl border-2`}
    >
      <div className="py-3">
        <SearchIcon className="w-6" />
      </div>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder="Search..."
        className="text-sm py-3"
      />
      {value && (
        <button type="button" onClick={onClear}>
          <CrossIcon className="w-5" />
        </button>
      )}
    </form>
  );
};

export default SearchBar;
