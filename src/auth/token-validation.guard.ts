import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './services/token.service';

/**
 * Guard to validate token exists in database and is active
 * Also updates last activity timestamp
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token with TokenService
    const userToken = await this.tokenService.validateToken(token);

    if (!userToken) {
      throw new UnauthorizedException('Token expired or invalid');
    }

    // Update activity timestamp
    await this.tokenService.updateActivity(token);

    return true;
  }
}
