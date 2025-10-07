import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionsService } from './services/transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

export interface GetTransactionsOptions {
  page: number;
  limit: number;
  type?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async getBalance(userId: bigint) {
    const wallet = await this.prisma.billetera.findUnique({
      where: { usuarioId: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    const balance = Number(wallet.saldoDolares);
    const reserved = Number(wallet.reservadoDolares);
    const total = balance + reserved;

    return {
      balance: balance.toFixed(2),
      reserved: reserved.toFixed(2),
      total: total.toFixed(2),
      lastUpdated: wallet.actualizadoEn,
    };
  }

  async deposit(userId: bigint, depositDto: DepositDto) {
    const { amount, description = 'Depósito manual' } = depositDto;

    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    if (amount > 10000) {
      throw new BadRequestException('El monto máximo por depósito es $10,000');
    }

    return this.prisma.executeTransaction(async (prisma) => {
      // Obtener o crear billetera
      let wallet = await prisma.billetera.findUnique({
        where: { usuarioId: userId },
      });

      if (!wallet) {
        wallet = await prisma.billetera.create({
          data: {
            usuarioId: userId,
            saldoDolares: 0,
            reservadoDolares: 0,
          },
        });
      }

      // Actualizar saldo
      const newBalance = Number(wallet.saldoDolares) + amount;
      await prisma.billetera.update({
        where: { id: wallet.id },
        data: {
          saldoDolares: newBalance,
          actualizadoEn: new Date(),
        },
      });

      // Crear transacción
      const transaction = await this.transactionsService.createTransaction({
        billeteraId: wallet.id,
        tipo: 'deposito',
        monto: amount,
        descripcion: description,
        referencia: `DEP-${Date.now()}`,
      });

      this.logger.log(`Depósito de $${amount} realizado para usuario ${userId}`);

      return {
        transactionId: transaction.id.toString(),
        amount: amount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        message: 'Depósito realizado exitosamente',
      };
    });
  }

  async withdraw(userId: bigint, withdrawDto: WithdrawDto) {
    const { amount, description = 'Retiro manual' } = withdrawDto;

    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    if (amount > 5000) {
      throw new BadRequestException('El monto máximo por retiro es $5,000');
    }

    return this.prisma.executeTransaction(async (prisma) => {
      // Obtener billetera
      const wallet = await prisma.billetera.findUnique({
        where: { usuarioId: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      const currentBalance = Number(wallet.saldoDolares);
      const reserved = Number(wallet.reservadoDolares);
      const availableBalance = currentBalance - reserved;

      if (amount > availableBalance) {
        throw new BadRequestException(
          `Saldo insuficiente. Disponible: $${availableBalance.toFixed(2)}`,
        );
      }

      // Actualizar saldo
      const newBalance = currentBalance - amount;
      await prisma.billetera.update({
        where: { id: wallet.id },
        data: {
          saldoDolares: newBalance,
          actualizadoEn: new Date(),
        },
      });

      // Crear transacción
      const transaction = await this.transactionsService.createTransaction({
        billeteraId: wallet.id,
        tipo: 'retiro',
        monto: amount,
        descripcion: description,
        referencia: `WTH-${Date.now()}`,
      });

      this.logger.log(`Retiro de $${amount} realizado para usuario ${userId}`);

      return {
        transactionId: transaction.id.toString(),
        amount: amount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        message: 'Retiro realizado exitosamente',
      };
    });
  }

  async reserveAmount(userId: bigint, amount: number, reference: string) {
    return this.prisma.executeTransaction(async (prisma) => {
      const wallet = await prisma.billetera.findUnique({
        where: { usuarioId: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      const currentBalance = Number(wallet.saldoDolares);
      const currentReserved = Number(wallet.reservadoDolares);
      const availableBalance = currentBalance - currentReserved;

      if (amount > availableBalance) {
        throw new BadRequestException(
          `Saldo insuficiente para reservar. Disponible: $${availableBalance.toFixed(2)}`,
        );
      }

      // Mover dinero de disponible a reservado
      const newReserved = currentReserved + amount;
      await prisma.billetera.update({
        where: { id: wallet.id },
        data: {
          reservadoDolares: newReserved,
          actualizadoEn: new Date(),
        },
      });

      // Crear transacción de reserva
      await this.transactionsService.createTransaction({
        billeteraId: wallet.id,
        tipo: 'reserva',
        monto: amount,
        descripcion: `Reserva para ${reference}`,
        referencia: reference,
      });

      this.logger.log(`Reserva de $${amount} realizada para usuario ${userId}`);

      return {
        amount: amount.toFixed(2),
        newReserved: newReserved.toFixed(2),
        availableBalance: (currentBalance - newReserved).toFixed(2),
      };
    });
  }

  async releaseReservation(userId: bigint, amount: number, reference: string) {
    return this.prisma.executeTransaction(async (prisma) => {
      const wallet = await prisma.billetera.findUnique({
        where: { usuarioId: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      const currentReserved = Number(wallet.reservadoDolares);

      if (amount > currentReserved) {
        throw new BadRequestException(
          `No se puede liberar más de lo reservado. Reservado: $${currentReserved.toFixed(2)}`,
        );
      }

      // Mover dinero de reservado a disponible
      const newReserved = currentReserved - amount;
      const updatedWallet = await prisma.billetera.update({
        where: { id: wallet.id },
        data: {
          reservadoDolares: newReserved,
          actualizadoEn: new Date(),
        },
      });

      // Crear transacción de liberación
      await this.transactionsService.createTransaction({
        billeteraId: wallet.id,
        tipo: 'liberacion',
        monto: amount,
        descripcion: `Liberación de reserva para ${reference}`,
        referencia: reference,
      });

      this.logger.log(`Liberación de reserva de $${amount} realizada para usuario ${userId}`);

      return {
        amount: amount.toFixed(2),
        newReserved: newReserved.toFixed(2),
        availableBalance: (Number(updatedWallet.saldoDolares) - newReserved).toFixed(2),
      };
    });
  }

  async confirmReservation(userId: bigint, amount: number, reference: string) {
    return this.prisma.executeTransaction(async (prisma) => {
      const wallet = await prisma.billetera.findUnique({
        where: { usuarioId: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      const currentReserved = Number(wallet.reservadoDolares);

      if (amount > currentReserved) {
        throw new BadRequestException(
          `No se puede confirmar más de lo reservado. Reservado: $${currentReserved.toFixed(2)}`,
        );
      }

      // Mover dinero de reservado a gastado (reducir saldo total)
      const newReserved = currentReserved - amount;
      const newBalance = Number(wallet.saldoDolares) - amount;

      await prisma.billetera.update({
        where: { id: wallet.id },
        data: {
          saldoDolares: newBalance,
          reservadoDolares: newReserved,
          actualizadoEn: new Date(),
        },
      });

      // Crear transacción de confirmación
      await this.transactionsService.createTransaction({
        billeteraId: wallet.id,
        tipo: 'apuesta',
        monto: amount,
        descripcion: `Apuesta confirmada: ${reference}`,
        referencia: reference,
      });

      this.logger.log(`Confirmación de apuesta de $${amount} realizada para usuario ${userId}`);

      return {
        amount: amount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        newReserved: newReserved.toFixed(2),
      };
    });
  }

  async getTransactions(userId: bigint, options: GetTransactionsOptions) {
    const { page, limit, type } = options;
    const skip = (page - 1) * limit;

    // Obtener billetera del usuario
    const wallet = await this.prisma.billetera.findUnique({
      where: { usuarioId: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    const where = type ? { billeteraId: wallet.id, tipo: type } : { billeteraId: wallet.id };

    const [transactions, total] = await Promise.all([
      this.prisma.transaccionWallet.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.transaccionWallet.count({ where }),
    ]);

    return {
      transactions: transactions.map((transaction) => ({
        id: transaction.id.toString(),
        type: transaction.tipo,
        amount: Number(transaction.monto).toFixed(2),
        description: transaction.descripcion,
        reference: transaction.referencia,
        createdAt: transaction.creadoEn,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransaction(userId: bigint, transactionId: bigint) {
    // Obtener billetera del usuario
    const wallet = await this.prisma.billetera.findUnique({
      where: { usuarioId: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    const transaction = await this.prisma.transaccionWallet.findFirst({
      where: {
        id: transactionId,
        billeteraId: wallet.id,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    return {
      id: transaction.id.toString(),
      type: transaction.tipo,
      amount: Number(transaction.monto).toFixed(2),
      description: transaction.descripcion,
      reference: transaction.referencia,
      createdAt: transaction.creadoEn,
    };
  }
}
