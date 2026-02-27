import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const InputSearchAdmin = ({ value, onChange, onSearch, placeholder = 'Tìm kiếm...' }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSearch) onSearch(value);
    }
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        <FontAwesomeIcon icon={['fas', 'magnifying-glass']} className="w-4 h-4" />
      </div>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 py-2 border rounded w-full"
      />
    </div>
  );
};

export default InputSearchAdmin;