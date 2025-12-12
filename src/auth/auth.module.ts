import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { EmailService } from './services/email.service';
import { CodeStorageService } from './services/code-storage.service';
import { User } from '../users/entities/user.entity';
import { StampsModule } from '../stamps/stamps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    StampsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailService, CodeStorageService],
  exports: [AuthService],
})
export class AuthModule {}
