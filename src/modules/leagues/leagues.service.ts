import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';

export interface FindLeaguesOptions {
  page: number;
  limit: number;
  sport?: string;
  country?: string;
}

export interface GetLeagueEventsOptions {
  page: number;
  limit: number;
  status?: string;
}

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindLeaguesOptions) {
    const { page, limit, sport, country } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (sport) {
      where.deporte = { contains: sport, mode: 'insensitive' };
    }
    if (country) {
      where.pais = { contains: country, mode: 'insensitive' };
    }

    const [leagues, total] = await Promise.all([
      this.prisma.liga.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { deporte: 'asc' },
          { nombre: 'asc' },
        ],
      }),
      this.prisma.liga.count({ where }),
    ]);

    return {
      data: leagues.map((league) => ({
        id: league.id.toString(),
        sport: league.deporte,
        name: league.nombre,
        country: league.pais,
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
    const league = await this.prisma.liga.findUnique({
      where: { id },
      include: {
        eventos: {
          include: {
            equipoLocal: true,
            equipoVisitante: true,
          },
          orderBy: {
            iniciaEn: 'desc',
          },
          take: 10, // Últimos 10 eventos
        },
      },
    });

    if (!league) {
      throw new NotFoundException('Liga no encontrada');
    }

    return {
      id: league.id.toString(),
      sport: league.deporte,
      name: league.nombre,
      country: league.pais,
      recentEvents: league.eventos.map((event) => ({
        id: event.id.toString(),
        homeTeam: event.equipoLocal.nombre,
        awayTeam: event.equipoVisitante.nombre,
        startTime: event.iniciaEn,
      })),
    };
  }

  async create(createLeagueDto: CreateLeagueDto) {
    const { sport, name, country } = createLeagueDto;

    // Verificar si la liga ya existe
    const existingLeague = await this.prisma.liga.findUnique({
      where: {
        ligas_unicas: {
          deporte: sport,
          nombre: name,
        },
      },
    });

    if (existingLeague) {
      throw new ConflictException('La liga ya existe');
    }

    const league = await this.prisma.liga.create({
      data: {
        deporte: sport,
        nombre: name,
        pais: country,
      },
    });

    this.logger.log(`Liga creada: ${league.deporte} - ${league.nombre}`);

    return {
      id: league.id.toString(),
      sport: league.deporte,
      name: league.nombre,
      country: league.pais,
    };
  }

  async update(id: bigint, updateLeagueDto: UpdateLeagueDto) {
    const { sport, name, country } = updateLeagueDto;

    // Verificar que la liga existe
    const existingLeague = await this.prisma.liga.findUnique({
      where: { id },
    });

    if (!existingLeague) {
      throw new NotFoundException('Liga no encontrada');
    }

    // Si se está cambiando el deporte o nombre, verificar que no exista otra liga con esa combinación
    if ((sport && sport !== existingLeague.deporte) || (name && name !== existingLeague.nombre)) {
      const duplicateLeague = await this.prisma.liga.findUnique({
        where: {
          ligas_unicas: {
            deporte: sport || existingLeague.deporte,
            nombre: name || existingLeague.nombre,
          },
        },
      });

      if (duplicateLeague) {
        throw new ConflictException('Ya existe una liga con ese deporte y nombre');
      }
    }

    const league = await this.prisma.liga.update({
      where: { id },
      data: {
        deporte: sport,
        nombre: name,
        pais: country,
      },
    });

    this.logger.log(`Liga actualizada: ${league.deporte} - ${league.nombre}`);

    return {
      id: league.id.toString(),
      sport: league.deporte,
      name: league.nombre,
      country: league.pais,
    };
  }

  async remove(id: bigint) {
    // Verificar que la liga existe
    const existingLeague = await this.prisma.liga.findUnique({
      where: { id },
    });

    if (!existingLeague) {
      throw new NotFoundException('Liga no encontrada');
    }

    // Verificar si tiene eventos asociados
    const eventCount = await this.prisma.evento.count({
      where: { ligaId: id },
    });

    if (eventCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la liga porque tiene ${eventCount} eventos asociados`,
      );
    }

    // Eliminar liga
    await this.prisma.liga.delete({
      where: { id },
    });

    this.logger.log(`Liga eliminada: ${existingLeague.deporte} - ${existingLeague.nombre}`);

    return {
      message: 'Liga eliminada exitosamente',
    };
  }

  async getLeagueEvents(leagueId: bigint, options: GetLeagueEventsOptions) {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;

    const where: any = { ligaId: leagueId };

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

  async getSports() {
    const sports = await this.prisma.liga.findMany({
      select: { deporte: true },
      distinct: ['deporte'],
      orderBy: { deporte: 'asc' },
    });

    return sports.map((sport) => sport.deporte);
  }

  async getCountries() {
    const countries = await this.prisma.liga.findMany({
      select: { pais: true },
      distinct: ['pais'],
      where: {
        pais: { not: null },
      },
      orderBy: { pais: 'asc' },
    });

    return countries.map((country) => country.pais).filter(Boolean);
  }
}
