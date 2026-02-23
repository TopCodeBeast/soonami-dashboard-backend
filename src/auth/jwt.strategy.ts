import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Pass through fs (frontend service) so TokenValidationGuard can skip DB for dashboard
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      fs: payload.fs,
    };
  }
}
