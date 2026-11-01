export const GENRE_LABELS = {
  Comics: 'Comics',
  'Kinh tế': 'Economics',
  'Chính trị': 'Politics',
  'Tình cảm/Lãng mạn': 'Romance',
  'Viễn tưởng': 'Science Fiction',
  'Kinh dị': 'Horror',
  'Self-help': 'Self-Help',
  'Kinh doanh/Tài chính': 'Business & Finance',
  'Bí ẩn/Trinh thám': 'Mystery & Detective',
};

export const genreLabel = (genre) => GENRE_LABELS[genre] || genre;