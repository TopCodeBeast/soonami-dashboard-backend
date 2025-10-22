export declare class CreateWalletDto {
    address: string;
    label?: string;
}
export declare class UpdateWalletDto {
    label?: string;
    isActive?: boolean;
}
export declare class WalletResponseDto {
    id: string;
    address: string;
    label: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
}
