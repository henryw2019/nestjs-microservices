import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PaginatedResult, QueryBuilderOptions } from '../interfaces/query-builder.interface';

interface WhereClause {
    deletedAt: null;
    OR?: Array<Record<string, { contains: string; mode: 'insensitive' }>>;
    [key: string]: unknown;
}

interface IncludeClause {
    [key: string]: boolean | { include: IncludeClause };
}

// 定义模型访问器的类型
type ModelAccessor<T> = {
    findMany: (options: unknown) => Promise<T[]>;
    count: (options: unknown) => Promise<number>;
};

// 辅助函数，用于安全地获取模型访问器
function getModelAccessor<T>(databaseService: DatabaseService, model: string): ModelAccessor<T> {
    // 使用类型断言，但限制在最小范围内
    const modelAccessor = (databaseService as any)[model];
    if (
        !modelAccessor ||
        typeof modelAccessor.findMany !== 'function' ||
        typeof modelAccessor.count !== 'function'
    ) {
        throw new Error(`Model ${model} not found or does not have required methods`);
    }
    return modelAccessor as ModelAccessor<T>;
}

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
        } = options;

        const page = Number(dto.page) || 1;
        const limit = Math.min(Number(dto.limit) || 10, 100);
        const skip = (page - 1) * limit;
        const sortBy = dto.sortBy || defaultSort.field;
        const sortOrder = dto.sortOrder || defaultSort.order;

        const where = this.buildWhereClause(
            dto as Record<string, unknown>,
            searchFields,
            customFilters,
        );
        const include = this.buildIncludeClause(relations);
        const modelAccessor = getModelAccessor<T>(this.databaseService, model);

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

        const totalPages = Math.ceil(total / limit) || 1;

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
        dto: Record<string, unknown>,
        searchFields: string[],
        customFilters: Record<string, unknown>,
    ): WhereClause {
        const where: WhereClause = { deletedAt: null };

        if (dto.search && searchFields.length) {
            where.OR = searchFields.map(field => ({
                [field]: { contains: dto.search as string, mode: 'insensitive' },
            }));
        }

        for (const [key, value] of Object.entries(dto)) {
            if (
                ['page', 'limit', 'search', 'sortBy', 'sortOrder'].includes(key) ||
                value === undefined ||
                value === null
            )
                continue;

            if (key.endsWith('Domain') && typeof value === 'string') {
                where[key.replace('Domain', '')] = { endsWith: `@${value}` };
            } else if (key.includes('Date') && typeof value === 'string') {
                where[key] = { gte: new Date(value) };
            } else if (Array.isArray(value)) {
                where[key] = { in: value };
            } else if (typeof value === 'string' && key.includes('Name')) {
                where[key] = { contains: value, mode: 'insensitive' };
            } else {
                where[key] = value;
            }
        }

        return { ...where, ...customFilters } as WhereClause;
    }

    private buildIncludeClause(relations: string[]): IncludeClause {
        const include: IncludeClause = {};
        for (const relation of relations) {
            if (!relation.includes('.')) {
                include[relation] = true;
                continue;
            }
            const parts = relation.split('.');
            let curr = include;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    curr[part] = true;
                } else {
                    curr[part] = curr[part] || { include: {} };
                    curr = (curr[part] as { include: IncludeClause }).include;
                }
            }
        }
        return include;
    }

    getCount(model: string, filters?: Record<string, unknown>): Promise<number> {
        const modelAccessor = getModelAccessor<never>(this.databaseService, model);
        return modelAccessor.count({ where: { deletedAt: null, ...filters } });
    }
}
