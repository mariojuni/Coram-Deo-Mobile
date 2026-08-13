import { useMemo, useState } from 'react';

type Book = {
  id: string | number;
  name?: string;
  title?: string;
};

export function useBooksModal(books: Book[]) {
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const sortedBooks = useMemo(() => {
    return [...(books || [])];
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
