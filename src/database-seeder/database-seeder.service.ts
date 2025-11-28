import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // Only run seeding in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SEEDING === 'true') {
      console.log('🌱 Starting database seeding...');
      await this.seedManagerUser();
      console.log('✅ Database seeding completed!');
    }
  }

  async seedManagerUser() {
    try {
      const managerEmail = process.env.MANAGER_EMAIL || 'maxb47163@gmail.com';
      const managerName = process.env.MANAGER_NAME || 'System Manager';

      // Check if manager already exists
      const existingManager = await this.userRepository.findOne({
        where: { email: managerEmail }
      });

      if (existingManager) {
        console.log(`⚠️  Manager user already exists: ${managerEmail}`);
        
        // Update role to manager if not already, and ensure isActive
        if (existingManager.role !== UserRole.MANAGER || !existingManager.isActive) {
          existingManager.role = UserRole.MANAGER;
          existingManager.isActive = true;
          await this.userRepository.save(existingManager);
          console.log(`✅ Updated user to manager: ${managerEmail}`);
        }
        return;
      }

      // Create new manager user (no password needed - uses email code verification)
      const managerUser = this.userRepository.create({
        email: managerEmail,
        name: managerName,
        role: UserRole.MANAGER,
        isActive: true,
        gem: 0,
      });

      const savedManager = await this.userRepository.save(managerUser);
      console.log(`✅ Manager user created: ${savedManager.email}`);
      console.log(`   ID: ${savedManager.id}`);
      console.log(`   Role: ${savedManager.role}`);
      console.log(`   Password: None (email code verification only)`);

    } catch (error) {
      console.error('❌ Error seeding manager user:', error.message);
    }
  }

  async seedAdminUser() {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
      const adminName = process.env.ADMIN_NAME || 'System Admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!@#';

      // Check if admin already exists
      const existingAdmin = await this.userRepository.findOne({
        where: { email: adminEmail }
      });

      if (existingAdmin) {
        console.log(`⚠️  Admin user already exists: ${adminEmail}`);
        return;
      }

      // Create new admin user (no password needed - uses email code verification)
      const adminUser = this.userRepository.create({
        email: adminEmail,
        name: adminName,
        role: UserRole.ADMIN,
        isActive: true,
        gem: 0,
      });

      const savedAdmin = await this.userRepository.save(adminUser);
      console.log(`✅ Admin user created: ${savedAdmin.email}`);
      console.log(`   ID: ${savedAdmin.id}`);
      console.log(`   Role: ${savedAdmin.role}`);
      console.log(`   Password: None (email code verification only)`);

    } catch (error) {
      console.error('❌ Error seeding admin user:', error.message);
    }
  }

  async seedTestUsers() {
    try {
      const testUsers = [
        {
          email: 'user1@test.com',
          name: 'Test User 1',
          password: 'user123!@#',
          role: UserRole.USER,
          gem: 100,
        },
        {
          email: 'user2@test.com',
          name: 'Test User 2',
          password: 'user123!@#',
          role: UserRole.USER,
          gem: 200,
        },
      ];

      for (const userData of testUsers) {
        const existingUser = await this.userRepository.findOne({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️  Test user already exists: ${userData.email}`);
          continue;
        }

        // Remove password from userData since it's not in the entity anymore
        const { password, ...userDataWithoutPassword } = userData;
        
        const user = this.userRepository.create({
          ...userDataWithoutPassword,
          isActive: true,
        });

        await this.userRepository.save(user);
        console.log(`✅ Test user created: ${userData.email}`);
      }

    } catch (error) {
      console.error('❌ Error seeding test users:', error.message);
    }
  }

  // Manual seeding method (can be called via API)
  async runFullSeeding() {
    console.log('🌱 Running full database seeding...');
    await this.seedManagerUser();
    await this.seedAdminUser();
    
    if (process.env.NODE_ENV === 'development') {
      await this.seedTestUsers();
    }
    
    console.log('✅ Full seeding completed!');
  }
}
