import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUserRole: UserRole) {
    // Only admins can create users
    if (currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create users');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      parseInt(process.env.BCRYPT_ROUNDS) || 12,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }

  async findAll(currentUserRole: UserRole) {
    // Only admins can view all users
    if (currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view all users');
    }

    const users = await this.userRepository.find({
      relations: ['wallets'],
      select: ['id', 'name', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });

    return users;
  }

  async findOne(id: string, currentUserId: string, currentUserRole: UserRole) {
    // Users can only view their own profile, admins can view any user
    if (currentUserRole !== UserRole.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['wallets'],
      select: ['id', 'name', 'email', 'role', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ) {
    // Users can only update their own profile (except role), admins can update any user
    if (currentUserRole !== UserRole.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles
    if (updateUserDto.role && currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        parseInt(process.env.BCRYPT_ROUNDS) || 12,
      );
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id, currentUserId, currentUserRole);
  }

  async remove(id: string, currentUserId: string, currentUserRole: UserRole) {
    // Only admins can delete users
    if (currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Prevent self-deletion
    if (currentUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async getProfile(currentUserId: string) {
    return this.findOne(currentUserId, currentUserId, UserRole.ADMIN);
  }
}
