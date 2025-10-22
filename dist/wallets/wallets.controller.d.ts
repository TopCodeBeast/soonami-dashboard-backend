import { WalletsService } from './wallets.service';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';
export declare class WalletsController {
    private readonly walletsService;
    constructor(walletsService: WalletsService);
    create(createWalletDto: CreateWalletDto, req: any, userId?: string): Promise<import("./entities/wallet.entity").Wallet>;
    findAll(req: any, userId?: string): Promise<import("./entities/wallet.entity").Wallet[]>;
    findOne(id: string, req: any): Promise<import("./entities/wallet.entity").Wallet>;
    update(id: string, updateWalletDto: UpdateWalletDto, req: any): Promise<import("./entities/wallet.entity").Wallet>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
}
