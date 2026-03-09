import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  Param,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenValidationGuard } from './token-validation.guard';
import { TokenService } from './services/token.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, RevokeAllSessionsDto, CheckUserDto, CheckTokenDto, DirectLoginDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request verification code' })
  @ApiResponse({ status: 200, description: 'Verification code sent successfully' })
  @ApiResponse({ status: 422, description: 'Invalid email format' })
  async requestCode(@Body() requestCodeDto: RequestCodeDto) {
    return this.authService.requestCode(requestCodeDto);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and login/register' })
  @ApiResponse({ status: 200, description: 'Code verified and user logged in' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  @ApiResponse({ status: 400, description: 'Name required for first-time registration' })
  @ApiResponse({ status: 409, description: 'Another session is already logged in' })
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto, @Request() req: any) {
    const frontendService = req.headers['x-frontend-service'] || req.headers['frontend-service'] || null;
    return this.authService.verifyCode(verifyCodeDto, frontendService);
  }

  @Post('revoke-all-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out of all other sessions' })
  @ApiResponse({ status: 200, description: 'All other sessions logged out' })
  @ApiResponse({ status: 401, description: 'Invalid or expired verification code' })
  async revokeAllSessions(@Body() revokeDto: RevokeAllSessionsDto) {
    return this.authService.revokeAllSessions(revokeDto);
  }

  @Post('check-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user exists and get role' })
  @ApiResponse({ status: 200, description: 'User check completed' })
  async checkUser(@Body() checkUserDto: CheckUserDto) {
    return this.authService.checkUser(checkUserDto);
  }

  @Post('check-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if token is valid and belongs to the given email' })
  @ApiResponse({ status: 200, description: 'Returns { valid: boolean, user?: ... }' })
  async checkToken(@Body() checkTokenDto: CheckTokenDto) {
    return this.authService.checkToken(checkTokenDto);
  }

  @Post('direct-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct login for verified admin/manager users (no password/code required)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'User not found, deactivated, or not admin/manager' })
  async directLogin(@Body() directLoginDto: DirectLoginDto, @Request() req: any) {
    const frontendService = req.headers['x-frontend-service'] || req.headers['frontend-service'] || null;
    return this.authService.directLoginForAdmin(directLoginDto.email, frontendService);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, TokenValidationGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and expire token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    return this.authService.logout(token);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard, TokenValidationGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user activity timestamp (heartbeat)' })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  async updateActivity(@Request() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const frontendService = req.headers['x-frontend-service'] || req.headers['frontend-service'];
    return this.authService.updateActivity(token, frontendService);
  }

  @Post('expire-inactivity')
  @UseGuards(JwtAuthGuard, TokenValidationGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expire token due to user inactivity (5 minutes)' })
  @ApiResponse({ status: 200, description: 'Token expired due to inactivity' })
  async expireInactivity(@Request() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const frontendService = req.headers['x-frontend-service'] || req.headers['frontend-service'];
    return this.authService.expireTokenDueToInactivity(token, frontendService);
  }

  /** Manager only: list all user tokens (for admin UI) */
  @Get('tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all user tokens (Manager only)' })
  @ApiResponse({ status: 200, description: 'List of tokens' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async listTokens(@Request() req: any) {
    if (req.user?.role !== 'manager') {
      throw new ForbiddenException('Only managers can list tokens');
    }
    const tokens = await this.tokenService.findAll();
    return tokens.map((t) => ({
      id: t.id,
      userId: t.userId,
      username: t.username,
      tokenPreview: t.token ? `${t.token.slice(0, 12)}...${t.token.slice(-4)}` : '',
      createdAt: t.createdAt,
      lastActivityAt: t.lastActivityAt,
      expiresAt: t.expiresAt,
      isActive: t.isActive,
      frontendService: t.frontendService ?? null,
    }));
  }

  /** Manager only: update token isActive */
  @Patch('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update token active state (Manager only)' })
  @ApiResponse({ status: 200, description: 'Token updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  async updateTokenActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    if (req.user?.role !== 'manager') {
      throw new ForbiddenException('Only managers can update tokens');
    }
    const updated = await this.tokenService.updateIsActive(id, !!body.isActive);
    return {
      id: updated.id,
      isActive: updated.isActive,
      username: updated.username,
    };
  }

  /** Manager only: delete token record */
  @Delete('tokens/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete token record (Manager only)' })
  @ApiResponse({ status: 200, description: 'Token deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Manager only' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async deleteToken(@Param('id') id: string, @Request() req: any) {
    if (req.user?.role !== 'manager') {
      throw new ForbiddenException('Only managers can delete tokens');
    }
    await this.tokenService.deleteById(id);
    return { deleted: true, id };
  }
}
