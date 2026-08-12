import { useMemo, useState } from 'react';

type Book = {
  id: string | number;
  name?: string;
  title?: string;
};

export function useBooksModal(books: Book[]) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'Traditional' | 'Alphabetical'>('Traditional');

  const sortedBooks = useMemo(() => {
    if (sortMode === 'Traditional') return [...(books || [])];
    return [...(books || [])].sort((first, second) =>
      (first.title || first.name || '').localeCompare(second.title || second.name || '')
    );
  }, [books, sortMode]);

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
    setSortMode,
    sortMode,
    sortedBooks,
    toggleBook,
  };
}
