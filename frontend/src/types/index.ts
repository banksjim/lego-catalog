export interface LegoSet {
  id: string;
  setNumber: string;
  alternateSetNumber?: string;
  title: string;
  owned: boolean;
  quantityOwned: number;
  releaseYear?: number;
  description?: string;
  series?: string;
  numParts: number;
  numMinifigs: number;
  bricklinkUrl?: string;
  rebrickableUrl?: string;
  approximateValue?: number;
  valueLastUpdated?: string;
  conditionDescription?: string;
  imageFilename?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLegoSetRequest {
  setNumber: string;
  alternateSetNumber?: string;
  title: string;
  owned: boolean;
  quantityOwned: number;
  releaseYear?: number;
  description?: string;
  series?: string;
  numParts: number;
  numMinifigs: number;
  bricklinkUrl?: string;
  rebrickableUrl?: string;
  approximateValue?: number;
  valueLastUpdated?: string;
  conditionDescription?: string;
  notes?: string;
}

export interface UpdateLegoSetRequest {
  setNumber?: string;
  alternateSetNumber?: string;
  title?: string;
  owned?: boolean;
  quantityOwned?: number;
  releaseYear?: number;
  description?: string;
  series?: string;
  numParts?: number;
  numMinifigs?: number;
  bricklinkUrl?: string;
  rebrickableUrl?: string;
  approximateValue?: number;
  valueLastUpdated?: string;
  conditionDescription?: string;
  notes?: string;
}

export interface Statistics {
  totalSets: number;
  ownedSets: number;
  totalPieces: number;
  totalMinifigs: number;
  totalValue: number;
  averageValue: number;
  mostExpensiveSet?: LegoSet;
  largestSet?: LegoSet;
  oldestSet?: LegoSet;
  newestSet?: LegoSet;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export type SortField = 'title' | 'set_number' | 'release_year' | 'approximate_value' | 'num_parts' | 'created_at';
export type SortOrder = 'ASC' | 'DESC';

export interface FilterOptions {
  series?: string;
  owned?: boolean;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}
