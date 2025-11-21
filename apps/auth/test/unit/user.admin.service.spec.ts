import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';

import { DatabaseService } from 'src/common/services/database.service';
import { QueryBuilderService } from 'src/common/services/query-builder.service';
import { UserListDto } from 'src/modules/user/dtos/user-list.dto';
import { UserResponseDto } from 'src/modules/user/dtos/user.response.dto';
import { UserAdminService } from 'src/modules/user/services/user.admin.service';

describe('UserAdminService', () => {
    let userAdminService: UserAdminService;
    let databaseService: DatabaseService;
    let queryBuilderService: QueryBuilderService;

    const mockDatabaseService = {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockQueryBuilderService = {
        findManyWithPagination: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAdminService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: QueryBuilderService, useValue: mockQueryBuilderService },
            ],
        }).compile();

        userAdminService = module.get<UserAdminService>(UserAdminService);
        databaseService = module.get<DatabaseService>(DatabaseService);
        queryBuilderService = module.get<QueryBuilderService>(QueryBuilderService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('listUsers', () => {
        const mockListDto: UserListDto = {
            page: 1,
            limit: 10,
            search: 'test',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        };

        const mockPaginatedResult = {
            items: [
                {
                    id: 'user-1',
                    email: 'user1@example.com',
                    firstName: 'User',
                    lastName: 'One',
                    role: Role.USER,
                    isVerified: true,
                    phoneNumber: null,
                    avatar: null,
                    createdAt: new Date('2023-01-01'),
                    updatedAt: new Date('2023-01-01'),
                    deletedAt: null,
                },
                {
                    id: 'user-2',
                    email: 'user2@example.com',
                    firstName: 'User',
                    lastName: 'Two',
                    role: Role.ADMIN,
                    isVerified: false,
                    phoneNumber: '+1234567890',
                    avatar: 'https://example.com/avatar.jpg',
                    createdAt: new Date('2023-01-02'),
                    updatedAt: new Date('2023-01-02'),
                    deletedAt: null,
                },
            ],
            meta: {
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            },
        };

        it('should return paginated users list', async () => {
            jest.spyOn(queryBuilderService, 'findManyWithPagination').mockResolvedValue(
                mockPaginatedResult,
            );

            const result = await userAdminService.listUsers(mockListDto);

            expect(result).toEqual(mockPaginatedResult);
            expect(queryBuilderService.findManyWithPagination).toHaveBeenCalledWith({
                model: 'user',
                dto: mockListDto,
                defaultSort: { field: 'createdAt', order: 'desc' },
                searchFields: ['firstName', 'lastName', 'email'],
            });
        });

        it('should handle empty search criteria', async () => {
            const emptyListDto: UserListDto = {
                page: 1,
                limit: 10,
            };

            jest.spyOn(queryBuilderService, 'findManyWithPagination').mockResolvedValue(
                mockPaginatedResult,
            );

            await userAdminService.listUsers(emptyListDto);

            expect(queryBuilderService.findManyWithPagination).toHaveBeenCalledWith({
                model: 'user',
                dto: emptyListDto,
                defaultSort: { field: 'createdAt', order: 'desc' },
                searchFields: ['firstName', 'lastName', 'email'],
            });
        });

        it('should handle custom sort criteria', async () => {
            const customSortDto: UserListDto = {
                page: 1,
                limit: 10,
                sortBy: 'email',
                sortOrder: 'asc',
            };

            jest.spyOn(queryBuilderService, 'findManyWithPagination').mockResolvedValue(
                mockPaginatedResult,
            );

            await userAdminService.listUsers(customSortDto);

            expect(queryBuilderService.findManyWithPagination).toHaveBeenCalledWith({
                model: 'user',
                dto: customSortDto,
                defaultSort: { field: 'createdAt', order: 'desc' },
                searchFields: ['firstName', 'lastName', 'email'],
            });
        });

        it('should handle search with multiple fields', async () => {
            const searchDto: UserListDto = {
                page: 1,
                limit: 10,
                search: 'john@example.com',
            };

            jest.spyOn(queryBuilderService, 'findManyWithPagination').mockResolvedValue(
                mockPaginatedResult,
            );

            await userAdminService.listUsers(searchDto);

            expect(queryBuilderService.findManyWithPagination).toHaveBeenCalledWith({
                model: 'user',
                dto: searchDto,
                defaultSort: { field: 'createdAt', order: 'desc' },
                searchFields: ['firstName', 'lastName', 'email'],
            });
        });
    });

    describe('deleteUser', () => {
        it('should soft delete user', async () => {
            const userId = 'user-123';
            const mockUser = { id: userId };
            (databaseService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (databaseService.user.update as jest.Mock).mockResolvedValue({ ...mockUser, deletedAt: new Date() });

            await userAdminService.deleteUser(userId);

            expect(databaseService.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: { deletedAt: expect.any(Date) },
            });
        });

        it('should throw NotFoundException if user not found', async () => {
            const userId = 'user-123';
            (databaseService.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(userAdminService.deleteUser(userId)).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateUser', () => {
        it('should update user details', async () => {
            const userId = 'user-123';
            const updateDto = { firstName: 'Updated' };
            const mockUser = { id: userId };
            (databaseService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (databaseService.user.update as jest.Mock).mockResolvedValue({ ...mockUser, ...updateDto });

            await userAdminService.updateUser(userId, updateDto);

            expect(databaseService.user.update).toHaveBeenCalledWith({
                where: { id: userId },
                data: expect.objectContaining({ firstName: 'Updated' }),
            });
        });

        it('should throw NotFoundException if user not found', async () => {
            const userId = 'user-123';
            const updateDto = { firstName: 'Updated' };
            (databaseService.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(userAdminService.updateUser(userId, updateDto)).rejects.toThrow(NotFoundException);
        });
    });
});
