import React from "react";
import { Pagination, PaginationItem, PaginationLink } from "reactstrap";

interface PaginationComponentProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({
  currentPage,
  pageCount,
  onPageChange,
}) => {
  // 1'den başlayarak page count'a kadar sayfa numaralarını oluştur
  const getPageNumbers = (): number[] => {
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5; // Gösterilecek maksimum sayfa sayısı

    if (pageCount <= maxPagesToShow) {
      // Toplam sayfa sayısı az ise tüm sayfaları göster
      for (let i = 1; i <= pageCount; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Toplam sayfa sayısı çok ise, mevcut sayfanın etrafındakileri göster
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(pageCount, startPage + maxPagesToShow - 1);

      // Eğer sona yaklaşıyorsak, başlangıç sayfasını ayarla
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // İlk sayfayı ve son sayfayı her zaman göster
      if (startPage > 1) {
        pageNumbers.unshift(1);
        if (startPage > 2) {
          pageNumbers.splice(1, 0, -1); // -1, "..." yerine kullanılır
        }
      }

      if (endPage < pageCount) {
        if (endPage < pageCount - 1) {
          pageNumbers.push(-1); // -1, "..." yerine kullanılır
        }
        pageNumbers.push(pageCount);
      }
    }

    return pageNumbers;
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination className="justify-content-center mt-3">
      <PaginationItem disabled={currentPage === 1}>
        <PaginationLink
          previous
          onClick={() => handlePageClick(currentPage - 1)}
        />
      </PaginationItem>

      {pageNumbers.map((page, index) =>
        page === -1 ? (
          <PaginationItem disabled key={`ellipsis-${index}`}>
            <PaginationLink>...</PaginationLink>
          </PaginationItem>
        ) : (
          <PaginationItem active={page === currentPage} key={page}>
            <PaginationLink onClick={() => handlePageClick(page)}>
              {page}
            </PaginationLink>
          </PaginationItem>
        )
      )}

      <PaginationItem disabled={currentPage === pageCount}>
        <PaginationLink
          next
          onClick={() => handlePageClick(currentPage + 1)}
        />
      </PaginationItem>
    </Pagination>
  );
};

export default PaginationComponent; 