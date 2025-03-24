import React, { Fragment, useEffect, useState } from "react";
import { CardBody, Col, Row, Table } from "reactstrap";

import {
  Column,
  Table as ReactTable,
  ColumnFiltersState,
  FilterFn,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';

import { rankItem } from '@tanstack/match-sorter-utils';

import {
  ProductsGlobalFilter,
  CustomersGlobalFilter,
  OrderGlobalFilter,
  ContactsGlobalFilter,
  CompaniesGlobalFilter,
  LeadsGlobalFilter,
  CryptoOrdersGlobalFilter,
  InvoiceListGlobalSearch,
  TicketsListGlobalFilter,
  NFTRankingGlobalFilter,
  TaskListGlobalFilter,
} from "../../Components/Common/GlobalSearchFilter";

// Column Filter
const Filter = ({
  column
}: {
  column: Column<any, unknown>;
  table: ReactTable<any>;
}) => {
  const columnFilterValue = column.getFilterValue();

  return (
    <>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={value => column.setFilterValue(value)}
        placeholder="Search..."
        className="w-36 border shadow rounded"
        list={column.id + 'list'}
      />
      <div className="h-1" />
    </>
  );
};

// Global Filter
const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [debounce, onChange, value]);

  return (
    <input {...props} value={value} id="search-bar-0" className="form-control search" onChange={e => setValue(e.target.value)} />
  );
};

interface TableContainerProps {
  columns?: any;
  data?: any;
  isGlobalFilter?: any;
  isProductsFilter?: any;
  isCustomerFilter?: any;
  isOrderFilter?: any;
  isContactsFilter?: any;
  isCompaniesFilter?: any;
  isLeadsFilter?: any;
  iscustomPageSize?: any;
  isCryptoOrdersFilter?: any;
  isInvoiceListFilter?: any;
  isTicketsListFilter?: any;
  isNFTRankingFilter?: any;
  isTaskListFilter?: any;
  handleTaskClick?: any;
  customPageSize?: any;
  tableClass?: any;
  theadClass?: any;
  trClass?: any;
  thClass?: any;
  divClass?: any;
  SearchPlaceholder?: any;
  handleLeadClick?: any;
  handleCompanyClick?: any;
  handleContactClick?: any;
  handleTicketClick?: any;
  isPagination?: boolean;
  totalCount?: number;
  pageCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sortConfig?: { key: string; direction: "asc" | "desc" } | null;
}

const TableContainer = ({
  columns,
  data,
  isGlobalFilter,
  isProductsFilter,
  isCustomerFilter,
  isOrderFilter,
  isContactsFilter,
  isCompaniesFilter,
  isLeadsFilter,
  isCryptoOrdersFilter,
  isInvoiceListFilter,
  isTicketsListFilter,
  isNFTRankingFilter,
  isTaskListFilter,
  customPageSize,
  tableClass,
  theadClass,
  trClass,
  thClass,
  divClass,
  SearchPlaceholder,
  isPagination,
  totalCount,
  pageCount,
  currentPage,
  onPageChange,
  onPageSizeChange,
  sortConfig
}: TableContainerProps) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value);
    addMeta({
      itemRank
    });
    return itemRank.passed;
  };

  const table = useReactTable({
    columns,
    data,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      columnFilters,
      globalFilter,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: pageCount || -1,
  });

  const {
    getHeaderGroups,
    getRowModel,
    getCanPreviousPage,
    getCanNextPage,
    getPageOptions,
    setPageIndex,
    nextPage,
    previousPage,
    setPageSize,
    getState
  } = table;

  useEffect(() => {
    Number(customPageSize) && setPageSize(Number(customPageSize));
  }, [customPageSize, setPageSize]);

  return (
    <Fragment>
      {isGlobalFilter && <Row className="mb-3">
        <CardBody className="border border-dashed border-end-0 border-start-0">
          <form>
            <Row>
              <Col sm={5}>
                <div className={(isProductsFilter || isContactsFilter || isCompaniesFilter || isNFTRankingFilter) ? "search-box me-2 mb-2 d-inline-block" : "search-box me-2 mb-2 d-inline-block col-12"}>
                  <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={value => setGlobalFilter(String(value))}
                    placeholder={SearchPlaceholder}
                  />
                  <i className="bx bx-search-alt search-icon"></i>
                </div>
              </Col>
              {isProductsFilter && (
                <ProductsGlobalFilter />
              )}
              {isCustomerFilter && (
                <CustomersGlobalFilter />
              )}
              {isOrderFilter && (
                <OrderGlobalFilter />
              )}
              {isContactsFilter && (
                <ContactsGlobalFilter />
              )}
              {isCompaniesFilter && (
                <CompaniesGlobalFilter />
              )}
              {isLeadsFilter && (
                <LeadsGlobalFilter />
              )}
              {isCryptoOrdersFilter && (
                <CryptoOrdersGlobalFilter />
              )}
              {isInvoiceListFilter && (
                <InvoiceListGlobalSearch />
              )}
              {isTicketsListFilter && (
                <TicketsListGlobalFilter />
              )}
              {isNFTRankingFilter && (
                <NFTRankingGlobalFilter />
              )}
              {isTaskListFilter && (
                <TaskListGlobalFilter />
              )}
            </Row>
          </form>
        </CardBody>
      </Row>}


      <div className={divClass}>
        <Table hover className={tableClass}>
          <thead className={theadClass}>
            {getHeaderGroups().map((headerGroup: any) => (
              <tr className={trClass} key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <th key={header.id} className={thClass}  {...{
                    onClick: header.column.getToggleSortingHandler(),
                  }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}

                    {{
                      asc: ' ',
                      desc: ' ',
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {getRowModel().rows.map((row: any) => {
              return (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell: any) => {
                    return (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      <Row className="justify-content-between align-items-center pe-2 mt-5">
        <Col>
          <div className="text-muted">
            <span className="fw-semibold">{totalCount}</span> sonuçtan
            <span className="fw-semibold ms-1">{data.length}</span> tanesi gösteriliyor          
          </div>
        </Col>
        <Col className="col-md-auto">
          <div className="d-flex gap-1">
            {isPagination ? (
              <>
                <button
                  className={`btn btn-primary go-to-page-btn ${currentPage === 0 ? 'disabled' : ''}`}
                  onClick={() => onPageChange && onPageChange(currentPage! - 1)}
                  disabled={currentPage === 0}
                  style={{ width: '40px', height: '38px' }}
                >
                  {"<"}
                </button>

                {(() => {
                  const maxVisibleButtons = 5;
                  const buttonsToShow = [];
                  const totalPages = pageCount || 0;
                  
                  if (totalPages <= maxVisibleButtons) {
                    // Toplam sayfa sayısı 5 veya daha az ise, tüm sayfaları göster
                    for (let i = 0; i < totalPages; i++) {
                      buttonsToShow.push(
                        <button
                          key={i}
                          className={`btn ${currentPage === i ? 'btn-primary active' : 'btn-light'}`}
                          onClick={() => onPageChange && onPageChange(i)}
                          style={{ width: '40px', height: '38px' }}
                        >
                          {i + 1}
                        </button>
                      );
                    }
                  } else {
                    // İlk sayfa butonunu her zaman göster
                    buttonsToShow.push(
                      <button
                        key={0}
                        className={`btn ${currentPage === 0 ? 'btn-primary active' : 'btn-light'}`}
                        onClick={() => onPageChange && onPageChange(0)}
                        style={{ width: '40px', height: '38px' }}
                      >
                        1
                      </button>
                    );
                    
                    // Ortadaki sayfa butonlarını hesapla
                    let startPage;
                    let endPage;
                    
                    if (currentPage !== undefined && currentPage <= 2) {
                      // Başlangıçtayız
                      startPage = 1;
                      endPage = 3;
                      
                      if (startPage > 1) {
                        buttonsToShow.push(
                          <button
                            key="leftEllipsis"
                            className="btn btn-light"
                            style={{ width: '40px', height: '38px' }}
                            disabled
                          >
                            ...
                          </button>
                        );
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        buttonsToShow.push(
                          <button
                            key={i}
                            className={`btn ${currentPage === i ? 'btn-primary active' : 'btn-light'}`}
                            onClick={() => onPageChange && onPageChange(i)}
                            style={{ width: '40px', height: '38px' }}
                          >
                            {i + 1}
                          </button>
                        );
                      }
                      
                      buttonsToShow.push(
                        <button
                          key="rightEllipsis"
                          className="btn btn-light"
                          style={{ width: '40px', height: '38px' }}
                          disabled
                        >
                          ...
                        </button>
                      );
                      
                    } else if (currentPage !== undefined && currentPage >= totalPages - 3) {
                      // Sondayız
                      startPage = totalPages - 4;
                      endPage = totalPages - 2;
                      
                      buttonsToShow.push(
                        <button
                          key="leftEllipsis"
                          className="btn btn-light"
                          style={{ width: '40px', height: '38px' }}
                          disabled
                        >
                          ...
                        </button>
                      );
                      
                      for (let i = startPage; i <= endPage; i++) {
                        buttonsToShow.push(
                          <button
                            key={i}
                            className={`btn ${currentPage === i ? 'btn-primary active' : 'btn-light'}`}
                            onClick={() => onPageChange && onPageChange(i)}
                            style={{ width: '40px', height: '38px' }}
                          >
                            {i + 1}
                          </button>
                        );
                      }
                      
                    } else {
                      // Ortadayız, currentPage tanımlıysa
                      const safeCurrentPage = currentPage || 0;
                      startPage = safeCurrentPage - 1;
                      endPage = safeCurrentPage + 1;
                      
                      buttonsToShow.push(
                        <button
                          key="leftEllipsis"
                          className="btn btn-light"
                          style={{ width: '40px', height: '38px' }}
                          disabled
                        >
                          ...
                        </button>
                      );
                      
                      for (let i = startPage; i <= endPage; i++) {
                        buttonsToShow.push(
                          <button
                            key={i}
                            className={`btn ${safeCurrentPage === i ? 'btn-primary active' : 'btn-light'}`}
                            onClick={() => onPageChange && onPageChange(i)}
                            style={{ width: '40px', height: '38px' }}
                          >
                            {i + 1}
                          </button>
                        );
                      }
                      
                      buttonsToShow.push(
                        <button
                          key="rightEllipsis"
                          className="btn btn-light"
                          style={{ width: '40px', height: '38px' }}
                          disabled
                        >
                          ...
                        </button>
                      );
                    }
                    
                    // Son sayfa butonunu her zaman göster
                    buttonsToShow.push(
                      <button
                        key={totalPages - 1}
                        className={`btn ${currentPage === totalPages - 1 ? 'btn-primary active' : 'btn-light'}`}
                        onClick={() => onPageChange && onPageChange(totalPages - 1)}
                        style={{ width: '40px', height: '38px' }}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return buttonsToShow;
                })()}

                <button
                  className={`btn btn-primary go-to-page-btn ${currentPage === (pageCount! - 1) ? 'disabled' : ''}`}
                  onClick={() => onPageChange && onPageChange(currentPage! + 1)}
                  disabled={currentPage === (pageCount! - 1)}
                  style={{ width: '40px', height: '38px' }}
                >
                  {">"}
                </button>
                
                <select
                  className="form-select"
                  value={customPageSize}
                  onChange={e => {
                    onPageSizeChange && onPageSizeChange(Number(e.target.value));
                  }}
                  style={{ width: '80px', height: '38px' }}
                >
                  {[10, 20, 30, 40, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary go-to-page-btn"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!getCanPreviousPage()}
                  style={{ width: '40px', height: '38px' }}
                >
                  {'<<'}
                </button>

                <button
                  className="btn btn-primary go-to-page-btn"
                  onClick={() => previousPage()}
                  disabled={!getCanPreviousPage()}
                  style={{ width: '40px', height: '38px' }}
                >
                  {'<'}
                </button>

                <span className="mx-2"> Sayfa{' '}</span>
                <span className="mx-2">
                  {getState().pagination.pageIndex + 1} / {getPageOptions().length}
                </span>

                <button
                  className="btn btn-primary go-to-page-btn"
                  onClick={() => nextPage()}
                  disabled={!getCanNextPage()}
                  style={{ width: '40px', height: '38px' }}
                >
                  {'>'}
                </button>

                <button
                  className="btn btn-primary go-to-page-btn"
                  onClick={() => table.setPageIndex(getPageOptions().length - 1)}
                  disabled={!getCanNextPage()}
                  style={{ width: '40px', height: '38px' }}
                >
                  {'>>'}
                </button>

                <select
                  className="form-select"
                  value={getState().pagination.pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                  }}
                  style={{ width: '80px', height: '38px' }}
                >
                  {[10, 20, 30, 40, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </Col>
      </Row>
    </Fragment>
  );
};

export default TableContainer;