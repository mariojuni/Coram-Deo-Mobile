import { useMemo, useState } from 'react';

type Book = {
  id: string | number;
  usfm?: string;
  name?: string;
  title?: string;
  abbreviation?: string;
  order?: number;
  chapterCount?: number;
};

export function useBooksModal(books: Book[]) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const sortedBooks = useMemo(() => {
    if (!books) return [];
    return [...books].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 0;
      const orderB = typeof b.order === 'number' ? b.order : 0;
      return orderA - orderB;
    });
  }, [books]);

  const toggleBook = (bookId: string | number) => {
    const normalizedBookId = String(bookId);
    setExpandedBook((previous) => (previous === normalizedBookId ? null : normalizedBookId));
  };

  const collapseBook = () => {
    setExpandedBook(null);
  };

  return {
    collapseBook,
    expandedBook,
    setExpandedBook,
    sortedBooks,
    toggleBook,
  };
}
