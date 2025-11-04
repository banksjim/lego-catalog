import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { legoSetApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import type { LegoSet, CreateLegoSetRequest, UpdateLegoSetRequest } from '../types';

const LegoSetForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    setNumber: '',
    alternateSetNumber: '',
    title: '',
    owned: false,
    quantityOwned: 0,
    releaseYear: '',
    description: '',
    series: '',
    numParts: 0,
    numMinifigs: 0,
    bricklinkUrl: '',
    rebrickableUrl: '',
    approximateValue: '',
    valueLastUpdated: '',
    conditionDescription: '',
    notes: '',
  });

  useEffect(() => {
    if (isEditMode && id) {
      loadSet(id);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    // Add paste event listener for clipboard image paste
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageFile(blob);
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const loadSet = async (setId: string) => {
    try {
      setLoading(true);
      const set = await legoSetApi.getById(setId);

      // Convert date from backend format to YYYY-MM-DD for input
      let dateValue = '';
      if (set.valueLastUpdated) {
        const date = new Date(set.valueLastUpdated);
        if (!isNaN(date.getTime())) {
          dateValue = date.toISOString().split('T')[0];
        }
      }

      setFormData({
        setNumber: set.setNumber,
        alternateSetNumber: set.alternateSetNumber || '',
        title: set.title,
        owned: set.owned,
        quantityOwned: set.quantityOwned,
        releaseYear: set.releaseYear?.toString() || '',
        description: set.description || '',
        series: set.series || '',
        numParts: set.numParts,
        numMinifigs: set.numMinifigs,
        bricklinkUrl: set.bricklinkUrl || '',
        rebrickableUrl: set.rebrickableUrl || '',
        approximateValue: set.approximateValue?.toString() || '',
        valueLastUpdated: dateValue,
        conditionDescription: set.conditionDescription || '',
        notes: set.notes || '',
      });

      if (set.imageFilename) {
        setImagePreview(`/images/${set.imageFilename}`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load set';
      toast.showError(`Error loading set: ${errorMessage}`);
      console.error(err);
      navigate('/sets');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Convert number inputs to actual numbers
    let processedValue: any = value;
    if (type === 'number' && (name === 'numParts' || name === 'numMinifigs' || name === 'quantityOwned')) {
      processedValue = value === '' ? 0 : parseInt(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue,
    }));
  };

  const handleImageFile = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.setNumber || !formData.title) {
      toast.showError('Set number and name are required');
      return;
    }

    // Validate Bricklink URL
    if (formData.bricklinkUrl && !formData.bricklinkUrl.includes('bricklink.com')) {
      toast.showError('Bricklink URL must contain "bricklink.com"');
      return;
    }

    // Validate Rebrickable URL
    if (formData.rebrickableUrl && !formData.rebrickableUrl.includes('rebrickable.com')) {
      toast.showError('Rebrickable URL must contain "rebrickable.com"');
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && id) {
        // Update existing set
        const updateData: UpdateLegoSetRequest = {
          setNumber: formData.setNumber,
          alternateSetNumber: formData.alternateSetNumber || undefined,
          title: formData.title,
          owned: formData.owned,
          quantityOwned: formData.quantityOwned,
          releaseYear: formData.releaseYear ? parseInt(formData.releaseYear) : undefined,
          description: formData.description || undefined,
          series: formData.series || undefined,
          numParts: formData.numParts,
          numMinifigs: formData.numMinifigs,
          bricklinkUrl: formData.bricklinkUrl || undefined,
          rebrickableUrl: formData.rebrickableUrl || undefined,
          approximateValue: formData.approximateValue ? parseFloat(formData.approximateValue) : undefined,
          valueLastUpdated: formData.valueLastUpdated || undefined,
          conditionDescription: formData.conditionDescription || undefined,
          notes: formData.notes || undefined,
        };

        await legoSetApi.update(id, updateData);

        // Upload image if provided
        if (imageFile) {
          await legoSetApi.uploadImage(id, imageFile);
        }

        toast.showSuccess('Set updated successfully!');
      } else {
        // Create new set
        const createData: CreateLegoSetRequest = {
          setNumber: formData.setNumber,
          alternateSetNumber: formData.alternateSetNumber || undefined,
          title: formData.title,
          owned: formData.owned,
          quantityOwned: formData.quantityOwned,
          releaseYear: formData.releaseYear ? parseInt(formData.releaseYear) : undefined,
          description: formData.description || undefined,
          series: formData.series || undefined,
          numParts: formData.numParts,
          numMinifigs: formData.numMinifigs,
          bricklinkUrl: formData.bricklinkUrl || undefined,
          rebrickableUrl: formData.rebrickableUrl || undefined,
          approximateValue: formData.approximateValue ? parseFloat(formData.approximateValue) : undefined,
          valueLastUpdated: formData.valueLastUpdated || undefined,
          conditionDescription: formData.conditionDescription || undefined,
          notes: formData.notes || undefined,
        };

        const newSet = await legoSetApi.create(createData);

        // Upload image if provided
        if (imageFile && newSet.id) {
          await legoSetApi.uploadImage(newSet.id, imageFile);
        }

        toast.showSuccess('Set created successfully!');
      }

      navigate('/sets');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save set';
      toast.showError(`Error saving set: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        {isEditMode ? 'Edit Lego Set' : 'Add New Lego Set'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Set Image
            </label>
            <div className="flex items-start space-x-4">
              {imagePreview && (
                <div className="flex-shrink-0 w-32 h-32 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  You can also paste an image from your clipboard (Ctrl+V / Cmd+V)
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="setNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Set Number *
              </label>
              <input
                type="text"
                id="setNumber"
                name="setNumber"
                value={formData.setNumber}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
              />
            </div>

            <div>
              <label htmlFor="alternateSetNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Alternate Set Number
              </label>
              <input
                type="text"
                id="alternateSetNumber"
                name="alternateSetNumber"
                value={formData.alternateSetNumber}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Set Name *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="series" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Series
            </label>
            <input
              type="text"
              id="series"
              name="series"
              value={formData.series}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="releaseYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Release Year
            </label>
            <input
              type="number"
              id="releaseYear"
              name="releaseYear"
              value={formData.releaseYear}
              onChange={handleInputChange}
              className="mt-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
              style={{ width: '120px' }}
            />
          </div>

          {/* Ownership */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="owned"
                  name="owned"
                  checked={formData.owned}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="owned" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  I own this set
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="quantityOwned" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity Owned
                </label>
                <input
                  type="number"
                  id="quantityOwned"
                  name="quantityOwned"
                  value={formData.quantityOwned}
                  onChange={handleInputChange}
                  min="0"
                  max="9999"
                  className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
                  style={{ width: '100px' }}
                />
              </div>
            </div>
          </div>

          {/* Set Details */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="numParts" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Number of Parts
                </label>
                <input
                  type="number"
                  id="numParts"
                  name="numParts"
                  value={formData.numParts}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="numMinifigs" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Number of Minifigs
                </label>
                <input
                  type="number"
                  id="numMinifigs"
                  name="numMinifigs"
                  value={formData.numMinifigs}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
                />
              </div>
            </div>
          </div>

          {/* Value Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="approximateValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Approximate Value ($)
                </label>
                <input
                  type="number"
                  id="approximateValue"
                  name="approximateValue"
                  value={formData.approximateValue}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="valueLastUpdated" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Value Last Updated
                </label>
                <input
                  type="date"
                  id="valueLastUpdated"
                  name="valueLastUpdated"
                  value={formData.valueLastUpdated}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="conditionDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Condition Description
            </label>
            <textarea
              id="conditionDescription"
              name="conditionDescription"
              rows={2}
              value={formData.conditionDescription}
              onChange={handleInputChange}
              placeholder="Description of the set's condition..."
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="bricklinkUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bricklink URL
            </label>
            <input
              type="text"
              id="bricklinkUrl"
              name="bricklinkUrl"
              value={formData.bricklinkUrl}
              onChange={handleInputChange}
              placeholder="www.bricklink.com/..."
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="rebrickableUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rebrickable URL
            </label>
            <input
              type="text"
              id="rebrickableUrl"
              name="rebrickableUrl"
              value={formData.rebrickableUrl}
              onChange={handleInputChange}
              placeholder="rebrickable.com/..."
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-base px-4 py-3"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/sets')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Set' : 'Create Set'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LegoSetForm;
