import { ApiProperty } from '@nestjs/swagger';

export class StampStatusResponseDto {
  @ApiProperty({ description: 'Current stamp count' })
  stampsCollected: number;

  @ApiProperty({ description: 'Stamps needed until reward' })
  stampsNeeded: number;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Whether user is eligible to collect a stamp' })
  eligible: boolean;

  @ApiProperty({ description: 'Minutes until next stamp can be collected', required: false })
  minutesUntilNext?: number;

  @ApiProperty({ description: 'Seconds until next stamp can be collected', required: false })
  secondsUntilNext?: number;
}

export class ClaimStampResponseDto {
  @ApiProperty({ description: 'Whether stamp was successfully collected' })
  success: boolean;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Current stamp count after collection' })
  stampsCollected: number;

  @ApiProperty({ description: 'Stamps needed until reward' })
  stampsNeeded: number;

  @ApiProperty({ description: 'Reward given if 7 stamps reached', nullable: true, required: false })
  reward?: {
    name: string;
    type: string;
    amount: number;
  };
}
