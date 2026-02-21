import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { EmailService } from './services/email.service';
import { CodeStorageService } from './services/code-storage.service';
import { TokenService } from './services/token.service';
import { TokenCleanupService } from './token-cleanup.service';
import { TokenValidationGuard } from './token-validation.guard';
import { User } from '../users/entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { StampsModule } from '../stamps/stamps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserToken]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    StampsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    EmailService,
    CodeStorageService,
    TokenService,
    TokenCleanupService,
    TokenValidationGuard,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
