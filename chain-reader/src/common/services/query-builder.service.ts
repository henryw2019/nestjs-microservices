import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PaginatedResult, QueryBuilderOptions } from '../interfaces/query-builder.interface';

@Injectable()
export class QueryBuilderService {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyWithPagination<T>(options: QueryBuilderOptions): Promise<PaginatedResult<T>> {
        const {
            model,
            dto,
            defaultSort = { field: 'createdAt', order: 'desc' },
            searchFields = [],
            relations = [],
            customFilters = {},
            defaultFilters = {},
            transformFields = {},
            include: includeOverride,
        } = options;

        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 25, 100);
        const skip = (page - 1) * limit;
        const sortBy = dto.sortBy || defaultSort.field;
        const sortOrder = dto.sortOrder || defaultSort.order;

        const where = this.buildWhereClause(dto, searchFields, customFilters, defaultFilters, transformFields);
        const include = includeOverride ?? this.buildIncludeClause(relations);
        const modelAccessor = this.databaseService[model as keyof DatabaseService] as any;

        const [items, total] = await Promise.all([
            modelAccessor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: Object.keys(include).length ? include : undefined,
            }),
            modelAccessor.count({ where }),
        ]);

        const totalPages = Math.max(Math.ceil(total / limit), 1);

        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    private buildWhereClause(
        dto: Record<string, any>,
        searchFields: string[],
        customFilters: Record<string, any>,
        defaultFilters: Record<string, any>,
        transformFields: Record<string, (value: any) => any>,
    ): Record<string, any> {
        const where: Record<string, any> = { ...defaultFilters };

        const entries = Object.entries(dto ?? {}).filter(([key, value]) =>
            !['page', 'limit', 'search', 'sortBy', 'sortOrder'].includes(key) && value !== undefined && value !== null && value !== '',
        );

        for (const [key, value] of entries) {
            const transformer = transformFields[key];
            const transformedValue = transformer ? transformer(value) : value;

            if (Array.isArray(transformedValue)) {
                where[key] = { in: transformedValue };
            } else {
                where[key] = transformedValue;
            }
        }

        if (dto.search && searchFields.length) {
            where.OR = searchFields.map(field => ({
                [field]: { contains: dto.search, mode: 'insensitive' },
            }));
        }

        return { ...where, ...customFilters };
    }

    private buildIncludeClause(relations: string[]): Record<string, any> {
        const include: Record<string, any> = {};

        for (const relation of relations) {
            if (!relation.includes('.')) {
                include[relation] = true;
                continue;
            }

            const parts = relation.split('.');
            let cursor = include;

            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    cursor[part] = true;
                } else {
                    cursor[part] = cursor[part] || { include: {} };
                    cursor = cursor[part].include;
                }
            });
        }

        return include;
    }
}
