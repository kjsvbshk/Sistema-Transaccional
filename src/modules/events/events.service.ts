import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface FindEventsOptions {
  page: number;
  limit: number;
  status?: string;
  league?: number;
  team?: number;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindEventsOptions) {
    const { page, limit, status, league, team } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (league) {
      where.ligaId = BigInt(league);
    }

    if (team) {
      where.OR = [
        { equipoLocalId: BigInt(team) },
        { equipoVisitanteId: BigInt(team) },
      ];
    }

    // Filtrar por estado basado en la fecha de inicio
    if (status) {
      const now = new Date();
      switch (status) {
        case 'upcoming':
          where.iniciaEn = { gt: now };
          break;
        case 'live':
          // Para simplificar, consideramos "live" como eventos que empezaron en las últimas 2 horas
          const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          where.iniciaEn = { gte: twoHoursAgo, lte: now };
          break;
        case 'finished':
          where.iniciaEn = { lt: now };
          break;
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.evento.findMany({
        where,
        skip,
        take: limit,
        include: {
          equipoLocal: true,
          equipoVisitante: true,
          liga: true,
          mercados: {
            where: { estado: 'abierto' },
            select: {
              id: true,
              tipoMercado: true,
              estado: true,
            },
          },
        },
        orderBy: {
          iniciaEn: 'asc',
        },
      }),
      this.prisma.evento.count({ where }),
    ]);

    return {
      data: events.map((event) => ({
        id: event.id.toString(),
        homeTeam: {
          id: event.equipoLocal.id.toString(),
          name: event.equipoLocal.nombre,
          country: event.equipoLocal.pais,
        },
        awayTeam: {
          id: event.equipoVisitante.id.toString(),
          name: event.equipoVisitante.nombre,
          country: event.equipoVisitante.pais,
        },
        league: {
          id: event.liga.id.toString(),
          name: event.liga.nombre,
          sport: event.liga.deporte,
        },
        startTime: event.iniciaEn,
        status: this.getEventStatus(event.iniciaEn),
        externalReference: event.referenciaExterna,
        markets: event.mercados.map((market) => ({
          id: market.id.toString(),
          type: market.tipoMercado,
          status: market.estado,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: bigint) {
    const event = await this.prisma.evento.findUnique({
      where: { id },
      include: {
        equipoLocal: true,
        equipoVisitante: true,
        liga: true,
        mercados: {
          include: {
            parametros: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    return {
      id: event.id.toString(),
      homeTeam: {
        id: event.equipoLocal.id.toString(),
        name: event.equipoLocal.nombre,
        country: event.equipoLocal.pais,
      },
      awayTeam: {
        id: event.equipoVisitante.id.toString(),
        name: event.equipoVisitante.nombre,
        country: event.equipoVisitante.pais,
      },
      league: {
        id: event.liga.id.toString(),
        name: event.liga.nombre,
        sport: event.liga.deporte,
      },
      startTime: event.iniciaEn,
      status: this.getEventStatus(event.iniciaEn),
      externalReference: event.referenciaExterna,
      markets: event.mercados.map((market) => ({
        id: market.id.toString(),
        type: market.tipoMercado,
        status: market.estado,
        createdAt: market.creadoEn,
        parameters: market.parametros.reduce((acc, param) => {
          acc[param.clave] = param.valor;
          return acc;
        }, {} as Record<string, string>),
      })),
    };
  }

  async create(createEventDto: CreateEventDto) {
    const {
      leagueId,
      homeTeamId,
      awayTeamId,
      startTime,
      externalReference,
    } = createEventDto;

    // Verificar que la liga existe
    const league = await this.prisma.liga.findUnique({
      where: { id: BigInt(leagueId) },
    });

    if (!league) {
      throw new NotFoundException('Liga no encontrada');
    }

    // Verificar que los equipos existen
    const [homeTeam, awayTeam] = await Promise.all([
      this.prisma.equipo.findUnique({ where: { id: BigInt(homeTeamId) } }),
      this.prisma.equipo.findUnique({ where: { id: BigInt(awayTeamId) } }),
    ]);

    if (!homeTeam) {
      throw new NotFoundException('Equipo local no encontrado');
    }

    if (!awayTeam) {
      throw new NotFoundException('Equipo visitante no encontrado');
    }

    // Verificar que no es el mismo equipo
    if (homeTeamId === awayTeamId) {
      throw new BadRequestException('El equipo local y visitante no pueden ser el mismo');
    }

    // Verificar que no existe un evento duplicado
    const existingEvent = await this.prisma.evento.findUnique({
      where: {
        eventos_unicos: {
          ligaId: BigInt(leagueId),
          equipoLocalId: BigInt(homeTeamId),
          equipoVisitanteId: BigInt(awayTeamId),
          iniciaEn: new Date(startTime),
        },
      },
    });

    if (existingEvent) {
      throw new ConflictException('Ya existe un evento con los mismos equipos y horario');
    }

    const event = await this.prisma.evento.create({
      data: {
        ligaId: BigInt(leagueId),
        equipoLocalId: BigInt(homeTeamId),
        equipoVisitanteId: BigInt(awayTeamId),
        iniciaEn: new Date(startTime),
        referenciaExterna: externalReference ?? null,
      },
    });

    this.logger.log(`Evento creado: ${homeTeam.nombre} vs ${awayTeam.nombre}`);

    return {
      id: event.id.toString(),
      homeTeam: {
        id: homeTeam.id.toString(),
        name: homeTeam.nombre,
        country: homeTeam.pais,
      },
      awayTeam: {
        id: awayTeam.id.toString(),
        name: awayTeam.nombre,
        country: awayTeam.pais,
      },
      league: {
        id: league.id.toString(),
        name: league.nombre,
        sport: league.deporte,
      },
      startTime: event.iniciaEn,
      status: this.getEventStatus(event.iniciaEn),
      externalReference: event.referenciaExterna,
    };
  }

  async update(id: bigint, updateEventDto: UpdateEventDto) {
    const { startTime, externalReference } = updateEventDto;

    // Verificar que el evento existe
    const existingEvent = await this.prisma.evento.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Verificar que el evento no haya comenzado
    if (existingEvent.iniciaEn <= new Date()) {
      throw new BadRequestException('No se puede modificar un evento que ya ha comenzado');
    }

    const event = await this.prisma.evento.update({
      where: { id },
      data: {
        ...(startTime && { iniciaEn: new Date(startTime) }),
        ...(externalReference !== undefined && { referenciaExterna: externalReference ?? null }),
      },
    });

    this.logger.log(`Evento actualizado: ${id}`);

    return {
      id: event.id.toString(),
      startTime: event.iniciaEn,
      externalReference: event.referenciaExterna,
    };
  }

  async remove(id: bigint) {
    // Verificar que el evento existe
    const existingEvent = await this.prisma.evento.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Verificar que el evento no haya comenzado
    if (existingEvent.iniciaEn <= new Date()) {
      throw new BadRequestException('No se puede eliminar un evento que ya ha comenzado');
    }

    // Verificar si tiene apuestas asociadas
    const betCount = await this.prisma.solicitud.count({
      where: { eventoId: id },
    });

    if (betCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el evento porque tiene ${betCount} apuestas asociadas`,
      );
    }

    // Eliminar evento (cascada eliminará mercados y parámetros)
    await this.prisma.evento.delete({
      where: { id },
    });

    this.logger.log(`Evento eliminado: ${id}`);

    return {
      message: 'Evento eliminado exitosamente',
    };
  }

  async getEventMarkets(eventId: bigint) {
    const event = await this.prisma.evento.findUnique({
      where: { id: eventId },
      include: {
        equipoLocal: true,
        equipoVisitante: true,
        mercados: {
          include: {
            parametros: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

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
        createdAt: market.creadoEn,
        parameters: market.parametros.reduce((acc, param) => {
          acc[param.clave] = param.valor;
          return acc;
        }, {} as Record<string, string>),
      })),
    };
  }

  async createMarket(eventId: bigint, createMarketDto: any) {
    const { type, parameters = {} } = createMarketDto;

    // Verificar que el evento existe
    const event = await this.prisma.evento.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const market = await this.prisma.mercado.create({
      data: {
        eventoId: eventId,
        tipoMercado: type,
        estado: 'abierto',
      },
    });

    // Crear parámetros del mercado
    if (Object.keys(parameters).length > 0) {
      await this.prisma.parametroMercado.createMany({
        data: Object.entries(parameters).map(([clave, valor]) => ({
          mercadoId: market.id,
          clave,
          valor: String(valor),
        })),
      });
    }

    this.logger.log(`Mercado creado: ${type} para evento ${eventId}`);

    return {
      id: market.id.toString(),
      type: market.tipoMercado,
      status: market.estado,
      createdAt: market.creadoEn,
      parameters,
    };
  }

  private getEventStatus(startTime: Date): string {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    if (startTime > now) {
      return 'upcoming';
    } else if (startTime >= twoHoursAgo && startTime <= now) {
      return 'live';
    } else {
      return 'finished';
    }
  }
}
