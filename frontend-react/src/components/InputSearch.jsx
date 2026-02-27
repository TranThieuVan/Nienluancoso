import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const InputSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const emitSearch = () => {
    if (!searchQuery.trim()) return;
    // Chuyển hướng kèm query URL, tí nữa mình sẽ xử lý Store tìm kiếm sau
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      emitSearch();
    }
  };

  return (
    <div className="relative w-full md:w-64">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tìm sách..."
        className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <FontAwesomeIcon
        icon={['fas', 'magnifying-glass']}
        className="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
        onClick={emitSearch}
      />
    </div>
  );
};

export default InputSearch;