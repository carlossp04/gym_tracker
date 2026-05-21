const SEARCH_CHAR_REPLACEMENTS = {
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ł: 'l',
  ß: 'ss',
  þ: 'th',
};

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[æœøđłßþ]/g, (character) => SEARCH_CHAR_REPLACEMENTS[character] || character)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
