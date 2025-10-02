import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { IdempotencyService } from './services/idempotency.service';
import { OddsService } from './services/odds.service';
import { CreateBetDto } from './dto/create-bet.dto';

export interface GetBetsOptions {
  page: number;
  limit: number;
  status?: string;
}

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly idempotencyService: IdempotencyService,
    private readonly oddsService: OddsService,
  ) {}

  async createBet(userId: bigint, createBetDto: CreateBetDto) {
    const {
      eventId,
      marketId,
      amount,
      selection,
      requestKey,
      versionModelo = 'v1.0',
    } = createBetDto;

    // Verificar idempotencia
    const existingRequest = await this.idempotencyService.checkIdempotency(requestKey);
    if (existingRequest) {
      throw new ConflictException('Solicitud duplicada');
    }

    // Bloquear la clave de idempotencia
    await this.idempotencyService.lockRequest(requestKey, 'bet_creation');

    try {
      return await this.prisma.executeTransaction(async (prisma) => {
        // Verificar que el evento existe y está disponible
        const event = await prisma.evento.findUnique({
          where: { id: eventId },
          include: {
            equipoLocal: true,
            equipoVisitante: true,
            liga: true,
          },
        });

        if (!event) {
          throw new NotFoundException('Evento no encontrado');
        }

        // Verificar que el evento no haya comenzado
        if (event.iniciaEn <= new Date()) {
          throw new BadRequestException('El evento ya ha comenzado');
        }

        // Verificar que el mercado existe y está abierto
        const market = await prisma.mercado.findFirst({
          where: {
            id: marketId,
            eventoId: eventId,
            estado: 'abierto',
          },
        });

        if (!market) {
          throw new NotFoundException('Mercado no encontrado o cerrado');
        }

        // Obtener cuotas actuales
        const odds = await this.oddsService.getCurrentOdds(BigInt(eventId), BigInt(marketId), selection);
        if (!odds) {
          throw new BadRequestException('Cuotas no disponibles para la selección');
        }

        // Verificar saldo disponible
        const wallet = await prisma.billetera.findUnique({
          where: { usuarioId: userId },
        });

        if (!wallet) {
          throw new NotFoundException('Billetera no encontrada');
        }

        const availableBalance = Number(wallet.saldoDolares) - Number(wallet.reservadoDolares);
        if (amount > availableBalance) {
          throw new BadRequestException(
            `Saldo insuficiente. Disponible: $${availableBalance.toFixed(2)}`,
          );
        }

        // Crear solicitud de apuesta
        const solicitud = await prisma.solicitud.create({
          data: {
            organizacionId: BigInt(1), // TODO: Obtener organización del usuario
            usuarioId: userId,
            eventoId: eventId,
            mercadoId: marketId,
            clave: requestKey,
            versionModelo,
            estado: 'recibida',
            metaCliente: {
              amount,
              selection,
              odds: Number(odds.precio),
            },
          },
        });

        // Crear evento de solicitud
        await prisma.eventoSolicitud.create({
          data: {
            solicitudId: solicitud.id,
            usuarioActorId: userId,
            aEstado: 'recibida',
            razon: 'Apuesta creada',
          },
        });

        // Crear snapshot de cuotas
        const snapshot = await prisma.cuotaSnapshot.create({
          data: {
            solicitudId: solicitud.id,
            resumenFuente: {
              provider: 'mock',
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Crear línea de cuota
        await prisma.cuotaLinea.create({
          data: {
            snapshotId: snapshot.id,
            proveedorId: BigInt(1), // Mock provider
            seleccion: selection,
            precio: odds.precio,
            probabilidadImplicita: odds.probabilidadImplicita,
          },
        });

        // Reservar dinero en la billetera
        await this.walletService.reserveAmount(userId, amount, `BET-${solicitud.id}`);

        // Actualizar estado de la solicitud
        await prisma.solicitud.update({
          where: { id: solicitud.id },
          data: { estado: 'completada' },
        });

        // Crear evento de completado
        await prisma.eventoSolicitud.create({
          data: {
            solicitudId: solicitud.id,
            usuarioActorId: userId,
            deEstado: 'recibida',
            aEstado: 'completada',
            razon: 'Apuesta procesada exitosamente',
          },
        });

        // Guardar resultado en idempotencia
        const result = {
          betId: solicitud.id.toString(),
          amount: amount.toFixed(2),
          odds: Number(odds.precio).toFixed(4),
          potentialWin: (amount * Number(odds.precio)).toFixed(2),
          status: 'completada',
          event: {
            id: event.id.toString(),
            homeTeam: event.equipoLocal.nombre,
            awayTeam: event.equipoVisitante.nombre,
            startTime: event.iniciaEn,
          },
          market: {
            id: market.id.toString(),
            type: market.tipoMercado,
            selection,
          },
        };

        await this.idempotencyService.saveResult(requestKey, result);

        this.logger.log(`Apuesta creada: ${solicitud.id} por $${amount}`);

        return result;
      });
    } catch (error) {
      // Liberar la clave de idempotencia en caso de error
      await this.idempotencyService.unlockRequest(requestKey);
      throw error;
    }
  }

  async getBets(userId: bigint, options: GetBetsOptions) {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;

    const where: any = { usuarioId: userId };
    if (status) {
      where.estado = status;
    }

    const [solicitudes, total] = await Promise.all([
      this.prisma.solicitud.findMany({
        where,
        skip,
        take: limit,
        include: {
          evento: {
            include: {
              equipoLocal: true,
              equipoVisitante: true,
            },
          },
          mercado: true,
        },
        orderBy: {
          creadoEn: 'desc',
        },
      }),
      this.prisma.solicitud.count({ where }),
    ]);

    const bets = solicitudes.map((solicitud) => {
      const meta = solicitud.metaCliente as any;
      return {
        id: solicitud.id.toString(),
        amount: meta?.amount ? Number(meta.amount).toFixed(2) : '0.00',
        odds: meta?.odds ? Number(meta.odds).toFixed(4) : '0.0000',
        potentialWin: meta?.amount && meta?.odds 
          ? (Number(meta.amount) * Number(meta.odds)).toFixed(2) 
          : '0.00',
        status: solicitud.estado,
        createdAt: solicitud.creadoEn,
        event: {
          homeTeam: solicitud.evento.equipoLocal.nombre,
          awayTeam: solicitud.evento.equipoVisitante.nombre,
          startTime: solicitud.evento.iniciaEn,
        },
        market: {
          type: solicitud.mercado.tipoMercado,
          selection: meta?.selection || 'N/A',
        },
      };
    });

    return {
      bets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBet(userId: bigint, betId: bigint) {
    const solicitud = await this.prisma.solicitud.findFirst({
      where: {
        id: betId,
        usuarioId: userId,
      },
      include: {
        evento: {
          include: {
            equipoLocal: true,
            equipoVisitante: true,
            liga: true,
          },
        },
        mercado: true,
        eventosSolicitud: {
          orderBy: {
            creadoEn: 'asc',
          },
        },
        cuotasSnapshots: {
          include: {
            cuotasLineas: true,
          },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Apuesta no encontrada');
    }

    const meta = solicitud.metaCliente as any;
    const latestSnapshot = solicitud.cuotasSnapshots[0];
    const oddsLine = latestSnapshot?.cuotasLineas[0];

    return {
      id: solicitud.id.toString(),
      amount: meta?.amount ? Number(meta.amount).toFixed(2) : '0.00',
      potentialWin: meta?.amount && meta?.odds 
        ? (Number(meta.amount) * Number(meta.odds)).toFixed(2) 
        : '0.00',
      status: solicitud.estado,
      createdAt: solicitud.creadoEn,
      updatedAt: solicitud.actualizadoEn,
      event: {
        id: solicitud.evento.id.toString(),
        homeTeam: solicitud.evento.equipoLocal.nombre,
        awayTeam: solicitud.evento.equipoVisitante.nombre,
        league: solicitud.evento.liga.nombre,
        startTime: solicitud.evento.iniciaEn,
      },
      market: {
        id: solicitud.mercado.id.toString(),
        type: solicitud.mercado.tipoMercado,
        selection: meta?.selection || 'N/A',
      },
      odds: {
        price: oddsLine?.precio ? Number(oddsLine.precio).toFixed(4) : '0.0000',
        impliedProbability: oddsLine?.probabilidadImplicita 
          ? Number(oddsLine.probabilidadImplicita).toFixed(4) 
          : '0.0000',
        collectedAt: oddsLine?.recolectadoEn,
      },
      history: solicitud.eventosSolicitud.map((evento) => ({
        fromStatus: evento.deEstado,
        toStatus: evento.aEstado,
        reason: evento.razon,
        timestamp: evento.creadoEn,
      })),
    };
  }

  async cancelBet(userId: bigint, betId: bigint) {
    return this.prisma.executeTransaction(async (prisma) => {
      const solicitud = await prisma.solicitud.findFirst({
        where: {
          id: betId,
          usuarioId: userId,
        },
      });

      if (!solicitud) {
        throw new NotFoundException('Apuesta no encontrada');
      }

      if (solicitud.estado !== 'completada') {
        throw new BadRequestException('Solo se pueden cancelar apuestas completadas');
      }

      // Verificar que el evento no haya comenzado
      const event = await prisma.evento.findUnique({
        where: { id: solicitud.eventoId },
      });

      if (!event || event.iniciaEn <= new Date()) {
        throw new BadRequestException('No se puede cancelar una apuesta de un evento que ya comenzó');
      }

      // Liberar reserva en la billetera
      const meta = solicitud.metaCliente as any;
      if (meta?.amount) {
        await this.walletService.releaseReservation(
          userId, 
          Number(meta.amount), 
          `BET-${solicitud.id}`
        );
      }

      // Actualizar estado de la solicitud
      await prisma.solicitud.update({
        where: { id: betId },
        data: { estado: 'cancelada' },
      });

      // Crear evento de cancelación
      await prisma.eventoSolicitud.create({
        data: {
          solicitudId: betId,
          usuarioActorId: userId,
          deEstado: 'completada',
          aEstado: 'cancelada',
          razon: 'Apuesta cancelada por el usuario',
        },
      });

      this.logger.log(`Apuesta cancelada: ${betId}`);

      return {
        message: 'Apuesta cancelada exitosamente',
        betId: betId.toString(),
      };
    });
  }

  async getEventOdds(eventId: bigint) {
    const event = await this.prisma.evento.findUnique({
      where: { id: eventId },
      include: {
        equipoLocal: true,
        equipoVisitante: true,
        mercados: {
          where: { estado: 'abierto' },
          include: {
            parametros: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const odds = await this.oddsService.getEventOdds(eventId);

    return {
      event: {
        id: event.id.toString(),
        homeTeam: event.equipoLocal.nombre,
        awayTeam: event.equipoVisitante.nombre,
        startTime: event.iniciaEn,
      },
      markets: event.mercados.map((market) => ({
        id: market.id.toString(),
        type: market.tipoMercado,
        status: market.estado,
        parameters: market.parametros.reduce((acc, param) => {
          acc[param.clave] = param.valor;
          return acc;
        }, {} as Record<string, string>),
      })),
      odds,
    };
  }
}
