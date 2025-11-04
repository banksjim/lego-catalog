import axios from 'axios';
import type { LegoSet, CreateLegoSetRequest, UpdateLegoSetRequest, Statistics, ImportResult, FilterOptions } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const legoSetApi = {
  // Get all Lego sets with optional filters
  getAll: async (filters?: FilterOptions): Promise<LegoSet[]> => {
    const params = new URLSearchParams();
    if (filters?.series) params.append('series', filters.series);
    if (filters?.owned !== undefined) params.append('owned', filters.owned.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await api.get<LegoSet[]>('/lego-sets', { params });
    return response.data;
  },

  // Get a single Lego set by ID
  getById: async (id: string): Promise<LegoSet> => {
    const response = await api.get<LegoSet>(`/lego-sets/${id}`);
    return response.data;
  },

  // Search for Lego sets
  search: async (query: string): Promise<LegoSet[]> => {
    const response = await api.get<LegoSet[]>('/lego-sets/search', {
      params: { q: query },
    });
    return response.data;
  },

  // Create a new Lego set
  create: async (data: CreateLegoSetRequest): Promise<LegoSet> => {
    const response = await api.post<LegoSet>('/lego-sets', data);
    return response.data;
  },

  // Update a Lego set
  update: async (id: string, data: UpdateLegoSetRequest): Promise<LegoSet> => {
    const response = await api.put<LegoSet>(`/lego-sets/${id}`, data);
    return response.data;
  },

  // Delete a Lego set
  delete: async (id: string): Promise<void> => {
    await api.delete(`/lego-sets/${id}`);
  },

  // Upload an image for a Lego set
  uploadImage: async (id: string, file: File): Promise<{ imageFilename: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<{ imageFilename: string }>(
      `/lego-sets/${id}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get all series names
  getAllSeries: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/series');
    return response.data;
  },

  // Get statistics
  getStatistics: async (): Promise<Statistics> => {
    const response = await api.get<Statistics>('/statistics');
    return response.data;
  },

  // Export to CSV
  exportCSV: async (): Promise<Blob> => {
    const response = await api.get('/lego-sets/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import from CSV
  importCSV: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('csv', file);

    const response = await api.post<ImportResult>('/lego-sets/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
