import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface CreateTransactionData {
  billeteraId: bigint;
  tipo: string;
  monto: number;
  descripcion?: string;
  referencia?: string;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(data: CreateTransactionData) {
    const transaction = await this.prisma.transaccionWallet.create({
      data: {
        billeteraId: data.billeteraId,
        tipo: data.tipo,
        monto: data.monto,
        descripcion: data.descripcion,
        referencia: data.referencia,
      },
    });

    this.logger.log(`Transacción creada: ${transaction.tipo} - $${data.monto}`);

    return transaction;
  }

  async getTransactionsByReference(reference: string) {
    return this.prisma.transaccionWallet.findMany({
      where: { referencia: reference },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async getTransactionsByType(billeteraId: bigint, type: string) {
    return this.prisma.transaccionWallet.findMany({
      where: {
        billeteraId,
        tipo: type,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async getTransactionSummary(billeteraId: bigint, startDate?: Date, endDate?: Date) {
    const where: any = { billeteraId };

    if (startDate && endDate) {
      where.creadoEn = {
        gte: startDate,
        lte: endDate,
      };
    }

    const transactions = await this.prisma.transaccionWallet.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
    });

    const summary = transactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.monto);
        
        switch (transaction.tipo) {
          case 'deposito':
            acc.totalDeposits += amount;
            break;
          case 'retiro':
            acc.totalWithdrawals += amount;
            break;
          case 'apuesta':
            acc.totalBets += amount;
            break;
          case 'ganancia':
            acc.totalWinnings += amount;
            break;
          case 'reserva':
            acc.totalReserved += amount;
            break;
          case 'liberacion':
            acc.totalReleased += amount;
            break;
        }

        acc.transactionCount++;
        return acc;
      },
      {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBets: 0,
        totalWinnings: 0,
        totalReserved: 0,
        totalReleased: 0,
        transactionCount: 0,
      },
    );

    return {
      ...summary,
      netBalance: summary.totalDeposits + summary.totalWinnings - summary.totalWithdrawals - summary.totalBets,
    };
  }
}
