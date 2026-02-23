import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './services/token.service';

/** soonami-dashboard-frontend: tokens are not in DB; allow by JWT only */
const DASHBOARD_FRONTEND = 'soonami-dashboard-frontend';

/**
 * Guard to validate token exists in database and is active (or is dashboard JWT).
 * Dashboard tokens are not stored; we allow them if JWT has fs claim.
 */
@Injectable()
export class TokenValidationGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);

    // Dashboard: no token in DB; JWT already verified by JwtAuthGuard
    if (request.user?.fs === DASHBOARD_FRONTEND) {
      return true;
    }

    const userToken = await this.tokenService.validateToken(token);
    if (!userToken) {
      throw new UnauthorizedException('Token expired or invalid');
    }

    await this.tokenService.updateActivity(token);
    return true;
  }
}
