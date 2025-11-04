import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { legoSetApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import type { LegoSet, SortField, SortOrder } from '../types';

const LegoSetList: React.FC = () => {
  const toast = useToast();
  const [sets, setSets] = useState<LegoSet[]>([]);
  const [filteredSets, setFilteredSets] = useState<LegoSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [ownedFilter, setOwnedFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');
  const [allSeries, setAllSeries] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSets();
    loadSeries();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1); // Reset to first page when filters change
  }, [sets, searchQuery, seriesFilter, ownedFilter, sortBy, sortOrder]);

  const loadSets = async () => {
    try {
      setLoading(true);
      const data = await legoSetApi.getAll();
      setSets(data);
      setError(null);
    } catch (err) {
      setError('Failed to load sets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSeries = async () => {
    try {
      const data = await legoSetApi.getAllSeries();
      setAllSeries(data);
    } catch (err) {
      console.error('Failed to load series:', err);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...sets];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (set) =>
          set.setNumber.toLowerCase().includes(query) ||
          set.title.toLowerCase().includes(query) ||
          set.description?.toLowerCase().includes(query) ||
          set.series?.toLowerCase().includes(query)
      );
    }

    // Apply series filter
    if (seriesFilter) {
      filtered = filtered.filter((set) => set.series === seriesFilter);
    }

    // Apply owned filter
    if (ownedFilter === 'owned') {
      filtered = filtered.filter((set) => set.owned);
    } else if (ownedFilter === 'not-owned') {
      filtered = filtered.filter((set) => !set.owned);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Convert to comparable values
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'ASC' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    setFilteredSets(filtered);
  };

  const handleExportCSV = async () => {
    try {
      const blob = await legoSetApi.exportCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lego_sets_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.showSuccess('CSV exported successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to export CSV';
      toast.showError(`Error exporting CSV: ${errorMessage}`);
      console.error(err);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const result = await legoSetApi.importCSV(file);

      // Build success message
      let message = `Import complete! Imported: ${result.imported}, Skipped: ${result.skipped}`;
      if (result.errors.length > 0) {
        message += `. Errors: ${result.errors.join(', ')}`;
        toast.showInfo(message);
      } else {
        toast.showSuccess(message);
      }

      loadSets();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to import CSV';
      toast.showError(`Error importing CSV: ${errorMessage}`);
      console.error(err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const totalValue = filteredSets
    .filter((set) => set.owned)
    .reduce((sum, set) => sum + (set.approximateValue || 0) * set.quantityOwned, 0);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSets = filteredSets.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Lego Sets</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Export CSV
          </button>
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
            {importing ? 'Importing...' : 'Import CSV'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              disabled={importing}
              className="sr-only"
            />
          </label>
          <Link
            to="/add"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Set
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`bg-white dark:bg-gray-800 shadow rounded-lg ${filtersExpanded ? 'p-4' : 'p-3 md:p-4'}`}>
        {/* Mobile toggle button */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className={`md:hidden w-full flex items-center justify-between text-gray-700 dark:text-gray-300 font-medium ${filtersExpanded ? 'mb-4' : ''}`}
        >
          <span>Search & Filters</span>
          <svg
            className={`h-5 w-5 transform transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filters content */}
        <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sets..."
              className="mt-1 block w-full h-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3"
            />
          </div>

          <div>
            <label htmlFor="series" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Series
            </label>
            <select
              id="series"
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3"
            >
              <option value="">All Series</option>
              {allSeries.map((series) => (
                <option key={series} value={series}>
                  {series}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="owned" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ownership
            </label>
            <select
              id="owned"
              value={ownedFilter}
              onChange={(e) => setOwnedFilter(e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3"
            >
              <option value="">All Sets</option>
              <option value="owned">Owned</option>
              <option value="not-owned">Not Owned</option>
            </select>
          </div>

          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort By
            </label>
            <div className="mt-1 flex space-x-2">
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="block w-full h-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm px-3"
              >
                <option value="title">Title</option>
                <option value="set_number">Set Number</option>
                <option value="release_year">Year</option>
                <option value="approximate_value">Value</option>
                <option value="num_parts">Parts</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                className="h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'ASC' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Total Value Banner */}
      {filteredSets.filter((set) => set.owned).length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Total value of owned sets: <span className="text-lg font-bold">${totalValue.toFixed(2)}</span>
            </span>
            <span className="text-sm text-green-600 dark:text-green-400">
              {filteredSets.filter((set) => set.owned).length} owned set(s)
            </span>
          </div>
        </div>
      )}

      {/* Pagination Controls - Top */}
      {filteredSets.length > 0 && (
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredSets.length)} of {filteredSets.length} sets
            </span>
            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPage" className="text-sm text-gray-700 dark:text-gray-300">
                Per page:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sets Grid */}
      {filteredSets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No sets found. Try adjusting your filters or add a new set.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedSets.map((set) => (
            <Link
              key={set.id}
              to={`/view/${set.id}`}
              className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              {set.imageFilename ? (
                <div className="w-full h-48 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                  <img
                    src={`/images/${set.imageFilename}`}
                    alt={set.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{set.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Set #{set.setNumber}</p>
                  </div>
                  {set.owned && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      Owned ({set.quantityOwned})
                    </span>
                  )}
                </div>

                {set.series && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{set.series}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {set.releaseYear && <div>Year: {set.releaseYear}</div>}
                  <div>Parts: {set.numParts}</div>
                  {set.numMinifigs > 0 && <div>Minifigs: {set.numMinifigs}</div>}
                  {set.approximateValue && <div>Value: ${set.approximateValue.toFixed(2)}</div>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls - Bottom */}
      {filteredSets.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegoSetList;
