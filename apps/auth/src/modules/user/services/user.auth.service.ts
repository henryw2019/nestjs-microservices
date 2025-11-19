import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/services/database.service';
import { Role } from '../../../../prisma-client/client';
import { UserResponseDto } from '../dtos/user.response.dto';
import { UserUpdateDto } from '../dtos/user.update.dto';

@Injectable()
export class UserAuthService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getUserProfile(userId: string): Promise<UserResponseDto | null> {
        const user = await this.databaseService.user.findUnique({
            where: { id: userId, deletedAt: null },
        });
        return user as UserResponseDto | null;
    }

    async getUserProfileByEmail(email: string): Promise<UserResponseDto | null> {
        const user = await this.databaseService.user.findUnique({
            where: { email, deletedAt: null },
        });
        return user as UserResponseDto | null;
    }

    async updateUserProfile(userId: string, updateDto: UserUpdateDto): Promise<UserResponseDto> {
        const user = await this.getUserProfile(userId);

        const updatedUser = await this.databaseService.user.update({
            where: { id: user.id },
            data: {
                firstName: updateDto.firstName?.trim(),
                lastName: updateDto.lastName?.trim(),
                email: updateDto.email,
                phoneNumber: updateDto.phoneNumber,
                avatar: updateDto.avatar,
            },
        });
        
        return updatedUser as UserResponseDto;
    }

    async createUser(data: Partial<UserResponseDto>): Promise<UserResponseDto> {
        const user = await this.databaseService.user.create({
            data: {
                email: data.email,
                firstName: data.firstName?.trim() || '',
                lastName: data.lastName?.trim() || '',
                phoneNumber: data.phoneNumber,
                avatar: data.avatar,
                password: data.password,
                role: Role.USER, // Assuming a default role
            },
        });
        
        return user as UserResponseDto;
    }
}
