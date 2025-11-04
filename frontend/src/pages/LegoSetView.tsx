import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { legoSetApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import type { LegoSet } from '../types';

const LegoSetView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [set, setSet] = useState<LegoSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine where we came from to show appropriate back button
  const fromDashboard = location.state?.from === 'dashboard';
  const backPath = fromDashboard ? '/' : '/sets';
  const backText = fromDashboard ? '← Back to Dashboard' : '← Back to My Sets';

  useEffect(() => {
    if (id) {
      loadSet();
    }
  }, [id]);

  const loadSet = async () => {
    try {
      setLoading(true);
      const data = await legoSetApi.getById(id!);
      setSet(data);
      setError(null);
    } catch (err) {
      setError('Failed to load set');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this set?')) {
      return;
    }

    try {
      await legoSetApi.delete(id!);
      toast.showSuccess('Set deleted successfully!');
      navigate('/sets');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete set';
      toast.showError(`Error deleting set: ${errorMessage}`);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error || 'Set not found'}</p>
        <Link to={backPath} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 inline-block">
          {backText}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with action buttons */}
      <div className="flex justify-between items-center">
        <Link
          to={backPath}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          {backText}
        </Link>
        <div className="flex space-x-2">
          <Link
            to={`/edit/${set.id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main content card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Image section */}
        {set.imageFilename ? (
          <div className="w-full">
            <img
              src={`/images/${set.imageFilename}`}
              alt={set.title}
              className="w-full max-h-96 object-contain bg-gray-100 dark:bg-gray-900"
            />
          </div>
        ) : (
          <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <svg className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Set details */}
        <div className="p-6 space-y-6">
          {/* Title and owned status */}
          <div>
            <div className="flex items-start justify-between">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{set.title}</h1>
              {set.owned && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Owned ({set.quantityOwned})
                </span>
              )}
            </div>
          </div>

          {/* Basic info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Set Number</h3>
              <p className="mt-1 text-base text-gray-900 dark:text-white">{set.setNumber}</p>
            </div>

            {set.alternateSetNumber && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Alternate Set Number</h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">{set.alternateSetNumber}</p>
              </div>
            )}

            {set.series && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Series / Theme</h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">{set.series}</p>
              </div>
            )}

            {set.releaseYear && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Release Year</h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">{set.releaseYear}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Parts</h3>
              <p className="mt-1 text-base text-gray-900 dark:text-white">{set.numParts}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Number of Minifigs</h3>
              <p className="mt-1 text-base text-gray-900 dark:text-white">{set.numMinifigs}</p>
            </div>

            {set.approximateValue && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Approximate Value</h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white">
                  ${set.approximateValue.toFixed(2)}
                  {set.valueLastUpdated && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      (as of {new Date(set.valueLastUpdated).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
            )}

            {set.conditionDescription && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Condition Description</h3>
                <p className="mt-1 text-base text-gray-900 dark:text-white whitespace-pre-wrap">{set.conditionDescription}</p>
              </div>
            )}

            {set.bricklinkUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bricklink</h3>
                <a
                  href={set.bricklinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-base text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                >
                  View on Bricklink
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {set.rebrickableUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rebrickable</h3>
                <a
                  href={set.rebrickableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-base text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                >
                  View on Rebrickable
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          {set.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
              <p className="mt-1 text-base text-gray-900 dark:text-white whitespace-pre-wrap">{set.description}</p>
            </div>
          )}

          {/* Notes */}
          {set.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h3>
              <p className="mt-1 text-base text-gray-900 dark:text-white whitespace-pre-wrap">{set.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
              {set.createdAt && (
                <div>
                  <span className="font-medium">Created:</span> {new Date(set.createdAt).toLocaleString()}
                </div>
              )}
              {set.updatedAt && (
                <div>
                  <span className="font-medium">Last Updated:</span> {new Date(set.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegoSetView;
