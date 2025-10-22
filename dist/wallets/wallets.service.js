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
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wallet_entity_1 = require("./entities/wallet.entity");
const user_entity_1 = require("../users/entities/user.entity");
let WalletsService = class WalletsService {
    constructor(walletRepository, userRepository) {
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
    }
    async create(createWalletDto, userId, currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN) {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
        }
        const existingWallet = await this.walletRepository.findOne({
            where: { address: createWalletDto.address },
        });
        if (existingWallet) {
            throw new common_1.ConflictException('Wallet address already exists');
        }
        const wallet = this.walletRepository.create({
            ...createWalletDto,
            userId,
        });
        return this.walletRepository.save(wallet);
    }
    async findAll(userId, currentUserId, currentUserRole) {
        if (currentUserRole !== user_entity_1.UserRole.ADMIN && currentUserId !== userId) {
            throw new common_1.ForbiddenException('You can only view your own wallets');
        }
        return this.walletRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id, currentUserId, currentUserRole) {
        const wallet = await this.walletRepository.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (currentUserRole !== user_entity_1.UserRole.ADMIN && wallet.userId !== currentUserId) {
            throw new common_1.ForbiddenException('You can only view your own wallets');
        }
        return wallet;
    }
    async update(id, updateWalletDto, currentUserId, currentUserRole) {
        const wallet = await this.walletRepository.findOne({
            where: { id },
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (currentUserRole !== user_entity_1.UserRole.ADMIN && wallet.userId !== currentUserId) {
            throw new common_1.ForbiddenException('You can only update your own wallets');
        }
        await this.walletRepository.update(id, updateWalletDto);
        return this.findOne(id, currentUserId, currentUserRole);
    }
    async remove(id, currentUserId, currentUserRole) {
        const wallet = await this.walletRepository.findOne({
            where: { id },
        });
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (currentUserRole !== user_entity_1.UserRole.ADMIN && wallet.userId !== currentUserId) {
            throw new common_1.ForbiddenException('You can only delete your own wallets');
        }
        await this.walletRepository.remove(wallet);
        return { message: 'Wallet deleted successfully' };
    }
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map