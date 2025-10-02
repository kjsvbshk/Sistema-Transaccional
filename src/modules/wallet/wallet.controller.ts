import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener saldo de la billetera' })
  @ApiResponse({
    status: 200,
    description: 'Saldo obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            balance: { type: 'string', description: 'Saldo disponible' },
            reserved: { type: 'string', description: 'Saldo reservado' },
            total: { type: 'string', description: 'Saldo total' },
            lastUpdated: { type: 'string', description: 'Última actualización' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  async getBalance(@CurrentUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Depositar dinero en la billetera' })
  @ApiResponse({
    status: 200,
    description: 'Depósito realizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            transactionId: { type: 'string' },
            amount: { type: 'string' },
            newBalance: { type: 'string' },
            message: { type: 'string' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Billetera no encontrada',
  })
  async deposit(
    @CurrentUser() user: any,
    @Body(ValidationPipe) depositDto: DepositDto,
  ) {
    return this.walletService.deposit(user.id, depositDto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retirar dinero de la billetera' })
  @ApiResponse({
    status: 200,
    description: 'Retiro realizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            transactionId: { type: 'string' },
            amount: { type: 'string' },
            newBalance: { type: 'string' },
            message: { type: 'string' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o saldo insuficiente',
  })
  @ApiResponse({
    status: 404,
    description: 'Billetera no encontrada',
  })
  async withdraw(
    @CurrentUser() user: any,
    @Body(ValidationPipe) withdrawDto: WithdrawDto,
  ) {
    return this.walletService.withdraw(user.id, withdrawDto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Obtener historial de transacciones' })
  @ApiResponse({
    status: 200,
    description: 'Historial de transacciones obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  amount: { type: 'string' },
                  description: { type: 'string' },
                  reference: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  async getTransactions(
    @CurrentUser() user: any,
    @Request() req: any,
  ) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;

    return this.walletService.getTransactions(user.id, { page, limit, type });
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Obtener detalles de una transacción' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la transacción obtenidos exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Transacción no encontrada',
  })
  async getTransaction(
    @CurrentUser() user: any,
    @Request() req: any,
  ) {
    const transactionId = req.params.id;
    return this.walletService.getTransaction(user.id, BigInt(transactionId));
  }
}
