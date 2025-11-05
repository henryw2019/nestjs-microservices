import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
const { PrismaClient } = require('./prisma-client');

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: typeof PrismaClient.prototype;

  constructor() {
    this.prisma = new PrismaClient();
  }

  get client(): typeof PrismaClient.prototype {
    return this.prisma;
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
