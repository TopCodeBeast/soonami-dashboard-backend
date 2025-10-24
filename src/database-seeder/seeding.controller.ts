import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DatabaseSeederService } from './database-seeder.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Database Seeding')
@Controller('seeding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SeedingController {
  constructor(private readonly seederService: DatabaseSeederService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run database seeding manually' })
  @ApiResponse({ status: 200, description: 'Seeding completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Authentication required' })
  async runSeeding() {
    await this.seederService.runFullSeeding();
    return {
      message: 'Database seeding completed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('manager')
  @ApiOperation({ summary: 'Seed manager user only' })
  @ApiResponse({ status: 200, description: 'Manager user seeded successfully' })
  async seedManager() {
    await this.seederService.seedManagerUser();
    return {
      message: 'Manager user seeded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
