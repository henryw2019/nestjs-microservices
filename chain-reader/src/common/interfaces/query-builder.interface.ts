export interface QueryBuilderOptions {
    model: string;
    dto: Record<string, any>;
    defaultSort?: { field: string; order: 'asc' | 'desc' };
    allowedSortFields?: string[];
    searchFields?: string[];
    relations?: string[];
    customFilters?: Record<string, any>;
    defaultFilters?: Record<string, any>;
    transformFields?: Record<string, (value: any) => any>;
    include?: Record<string, any>;
}

export interface PaginatedResult<T> {
    items: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}
