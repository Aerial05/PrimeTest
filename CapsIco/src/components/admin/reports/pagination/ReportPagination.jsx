import React from 'react';
import styles from './ReportPagination.module.css';

export function ReportPagination({ currentPage, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationItem} onClick={handlePrev}>
        &lt;
      </div>
      {pages.map((page) => (
        <div
          key={page}
          className={`${styles.paginationItem} ${page === currentPage ? styles.active : ''}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </div>
      ))}
      <div className={styles.paginationItem} onClick={handleNext}>
        &gt;
      </div>
    </div>
  );
}
