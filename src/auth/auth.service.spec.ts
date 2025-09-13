import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const hashedPassword = 'hashedPassword123';
      const expectedUser = {
        id: 'user1',
        ...registerInput,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedToken = 'jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(expectedUser);
      mockJwtService.sign.mockReturnValue(expectedToken);

      // Mock bcrypt.hash
      jest.spyOn(require('bcryptjs'), 'hash').mockResolvedValue(hashedPassword);

      const result = await service.register(registerInput);

      expect(result).toEqual({
        token: expectedToken,
        user: expectedUser,
      });

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: registerInput.email },
            { username: registerInput.username },
          ],
        },
      });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...registerInput,
          password: hashedPassword,
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: expectedUser.id,
          email: expectedUser.email,
          username: expectedUser.username,
        },
        {
          expiresIn: '7d',
          secret: 'test-secret',
        }
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const existingUser = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);

      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictException
      );
      await expect(service.register(registerInput)).rejects.toThrow(
        'User with this email or username already exists'
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedPassword123',
      };

      const expectedToken = 'jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(expectedToken);

      // Mock bcrypt.compare
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

      const result = await service.login(loginInput);

      expect(result).toEqual({
        token: expectedToken,
        user: user,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginInput.email },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
        },
        {
          expiresIn: '7d',
          secret: 'test-secret',
        }
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(loginInput)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const user = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      // Mock bcrypt.compare to return false
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.login(loginInput)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const user = {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser('user1');

      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent');

      expect(result).toBeNull();
    });
  });
});