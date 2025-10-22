"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async create(createUserDto, currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can create users');
        }
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        const user = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
        });
        const savedUser = await this.userRepository.save(user);
        const { password, ...result } = savedUser;
        return result;
    }
    async findAll(currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can view all users');
        }
        const users = await this.userRepository.find({
            relations: ['wallets'],
            select: ['id', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
        });
        return users;
    }
    async findOne(id, currentUserId, currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN && currentUserId !== id) {
            throw new common_1.ForbiddenException('You can only view your own profile');
        }
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['wallets'],
            select: ['id', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async update(id, updateUserDto, currentUserId, currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN && currentUserId !== id) {
            throw new common_1.ForbiddenException('You can only update your own profile');
        }
        if (updateUserDto.role && currentUserRole !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can change user roles');
        }
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        }
        await this.userRepository.update(id, updateUserDto);
        return this.findOne(id, currentUserId, currentUserRole);
    }
    async remove(id, currentUserId, currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can delete users');
        }
        if (currentUserId === id) {
            throw new common_1.ForbiddenException('You cannot delete your own account');
        }
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.userRepository.remove(user);
        return { message: 'User deleted successfully' };
    }
    async getProfile(currentUserId) {
        return this.findOne(currentUserId, currentUserId, user_entity_1.UserRole.ADMIN);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map