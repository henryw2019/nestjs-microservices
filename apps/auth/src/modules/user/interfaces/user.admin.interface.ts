import { PaginatedResult } from 'src/common/interfaces/query-builder.interface';
import { UserListDto } from '../dtos/user-list.dto';
import { UserResponseDto } from '../dtos/user.response.dto';
import { UserAdminUpdateDto } from '../dtos/user.admin-update.dto';

export interface IUserAdminService {
    listUsers(listDto: UserListDto): Promise<PaginatedResult<UserResponseDto>>;
    deleteUser(userId: string): Promise<void>;
    updateUser(userId: string, updateDto: UserAdminUpdateDto): Promise<UserResponseDto>;
}
