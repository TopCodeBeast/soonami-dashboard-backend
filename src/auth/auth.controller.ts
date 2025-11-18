import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, RequestCodeDto, VerifyCodeDto, CheckUserDto, DirectLoginDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

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
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto);
  }

  @Post('check-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user exists and get role' })
  @ApiResponse({ status: 200, description: 'User check completed' })
  async checkUser(@Body() checkUserDto: CheckUserDto) {
    return this.authService.checkUser(checkUserDto);
  }

  @Post('direct-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct login for verified admin/manager users (no password/code required)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'User not found, deactivated, or not admin/manager' })
  async directLogin(@Body() directLoginDto: DirectLoginDto) {
    return this.authService.directLoginForAdmin(directLoginDto.email);
  }
}
