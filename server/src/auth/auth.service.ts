import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'craftscape-hk-secret-key-change-in-production';
  private readonly JWT_EXPIRES_IN = '30d';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(
    email: string,
    password: string,
    username: string,
    role: string = 'user',
  ): Promise<{ message: string; token: string; user: any }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      username,
      password: hashedPassword,
      role,
      profileJson: JSON.stringify({
        hasCompletedOnboarding: false,
        interests: [],
      }),
    });

    await this.userRepository.save(user);

    // Generate token
    const token = this.generateToken(user);

    return {
      message: 'Registration successful',
      token,
      user: this.sanitizeUser(user),
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ message: string; token: string; user: any }> {
    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      message: 'Login successful',
      token,
      user: this.sanitizeUser(user),
    };
  }

  async verifyToken(token: string): Promise<User> {
    try {
      const decoded: any = jwt.verify(token, this.JWT_SECRET);
      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getProfile(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: number, profileData: any): Promise<{ user: any }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Merge existing profile with new data
    const currentProfile = user.profile;
    user.profile = { ...currentProfile, ...profileData };

    await this.userRepository.save(user);

    return {
      user: this.sanitizeUser(user),
    };
  }

  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  private sanitizeUser(user: User): any {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
    };
  }
}

