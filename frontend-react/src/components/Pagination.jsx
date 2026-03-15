import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getVisiblePages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <div className="flex justify-center items-center gap-1 select-none">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-9 h-9 flex items-center justify-center border border-gray-200 text-stone-500 hover:border-black hover:text-black transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <FontAwesomeIcon icon={['fas', 'angle-left']} className="text-xs" />
      </button>

      {/* Pages */}
      {visiblePages.map((page, index) =>
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="w-9 h-9 flex items-center justify-center text-stone-400 text-sm">
            ···
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 flex items-center justify-center text-sm border transition-all duration-200 ${currentPage === page
              ? 'bg-black text-white border-black font-semibold'
              : 'border-gray-200 text-stone-600 hover:border-black hover:text-black'
              }`}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-9 h-9 flex items-center justify-center border border-gray-200 text-stone-500 hover:border-black hover:text-black transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <FontAwesomeIcon icon={['fas', 'angle-right']} className="text-xs" />
      </button>
    </div>
  );
};

export default Pagination;