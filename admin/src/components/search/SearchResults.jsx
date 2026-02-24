import { Link } from "react-router-dom";

const SearchResults = ({ results, hasSearched }) => {
  if (!hasSearched) {
    return null;
  }

  if (results.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">No results found</div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {results.map((user) => (
        <div
          key={user._id}
          className="flex items-start gap-4 transition-all rounded-xl xl:w-3/4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-24">
              <Link key={user._id} to={`/profile/${user.username}`}>
                <h3 className="font-bold text-md hover:underline">
                  {user.name}
                </h3>
                <p className="text-sm text-gray-500 -translate-y-0.75">
                  {user.username}
                </p>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;
