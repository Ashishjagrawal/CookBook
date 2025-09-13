import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      include: {
        _count: {
          select: {
            recipes: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    return users.map(user => ({
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      recipesCount: user._count.recipes,
    }));
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recipes: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      recipesCount: user._count.recipes,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    // Check if email or username is already taken by another user
    if (input.email || input.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                input.email ? { email: input.email } : {},
                input.username ? { username: input.username } : {},
              ],
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('Email or username already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: input,
      include: {
        _count: {
          select: {
            recipes: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      recipesCount: user._count.recipes,
    };
  }

  async delete(id: string): Promise<boolean> {
    await this.prisma.user.delete({
      where: { id },
    });
    return true;
  }

  async followUser(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) {
      throw new ConflictException('Cannot follow yourself');
    }

    // Check if user exists
    const userToFollow = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    return true;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return true;
  }

  async getFollowers(userId: string, skip = 0, take = 10): Promise<User[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          include: {
            _count: {
              select: {
                recipes: true,
                followers: true,
                following: true,
              },
            },
          },
        },
      },
      skip,
      take,
    });

    return follows.map(follow => ({
      ...follow.follower,
      followersCount: follow.follower._count.followers,
      followingCount: follow.follower._count.following,
      recipesCount: follow.follower._count.recipes,
    }));
  }

  async getFollowing(userId: string, skip = 0, take = 10): Promise<User[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          include: {
            _count: {
              select: {
                recipes: true,
                followers: true,
                following: true,
              },
            },
          },
        },
      },
      skip,
      take,
    });

    return follows.map(follow => ({
      ...follow.following,
      followersCount: follow.following._count.followers,
      followingCount: follow.following._count.following,
      recipesCount: follow.following._count.recipes,
    }));
  }
}
