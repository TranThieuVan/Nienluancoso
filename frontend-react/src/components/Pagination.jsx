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

  const visiblePages = getVisiblePages();

  return (
    <div className="flex justify-center mt-6 items-center gap-1 text-sm select-none">
      {/* Nút lùi */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <FontAwesomeIcon icon={['fas', 'angle-left']} />
      </button>

      {/* Số trang */}
      {visiblePages.map((page, index) => (
        page === '...' ? (
          <span key={index} className="px-2 py-1 text-gray-500">...</span>
        ) : (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`px-2 py-1 border rounded hover:bg-gray-100 ${currentPage === page ? 'bg-blue-500 text-white' : ''
              }`}
          >
            {page}
          </button>
        )
      ))}

      {/* Nút tiến */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <FontAwesomeIcon icon={['fas', 'angle-right']} />
      </button>
    </div>
  );
};

export default Pagination;