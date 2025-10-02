import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { BetsService } from './bets.service';
import { CreateBetDto } from './dto/create-bet.dto';

@ApiTags('Bets')
@Controller('bets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva apuesta' })
  @ApiResponse({
    status: 201,
    description: 'Apuesta creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            betId: { type: 'string' },
            amount: { type: 'string' },
            odds: { type: 'string' },
            potentialWin: { type: 'string' },
            status: { type: 'string' },
            event: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                homeTeam: { type: 'string' },
                awayTeam: { type: 'string' },
                startTime: { type: 'string' },
              },
            },
            market: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                selection: { type: 'string' },
              },
            },
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
    description: 'Evento o mercado no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Solicitud duplicada (idempotencia)',
  })
  async createBet(
    @CurrentUser() user: any,
    @Body(ValidationPipe) createBetDto: CreateBetDto,
  ) {
    return this.betsService.createBet(user.id, createBetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de apuestas del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de apuestas obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            bets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'string' },
                  odds: { type: 'string' },
                  potentialWin: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  event: {
                    type: 'object',
                    properties: {
                      homeTeam: { type: 'string' },
                      awayTeam: { type: 'string' },
                      startTime: { type: 'string' },
                    },
                  },
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
  async getBets(
    @CurrentUser() user: any,
    @Request() req: any,
  ) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    return this.betsService.getBets(user.id, { page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de una apuesta' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la apuesta obtenidos exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Apuesta no encontrada',
  })
  async getBet(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.betsService.getBet(user.id, BigInt(id));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar una apuesta' })
  @ApiResponse({
    status: 200,
    description: 'Apuesta cancelada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'La apuesta no puede ser cancelada',
  })
  @ApiResponse({
    status: 404,
    description: 'Apuesta no encontrada',
  })
  async cancelBet(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.betsService.cancelBet(user.id, BigInt(id));
  }

  @Get('odds/:eventId')
  @ApiOperation({ summary: 'Obtener cuotas de un evento' })
  @ApiResponse({
    status: 200,
    description: 'Cuotas obtenidas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async getEventOdds(
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.betsService.getEventOdds(BigInt(eventId));
  }
}
