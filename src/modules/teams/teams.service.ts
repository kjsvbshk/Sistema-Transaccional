import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

export interface FindTeamsOptions {
  page: number;
  limit: number;
  search?: string;
  country?: string;
}

export interface GetTeamEventsOptions {
  page: number;
  limit: number;
  status?: string;
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindTeamsOptions) {
    const { page, limit, search, country } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.nombre = { contains: search, mode: 'insensitive' };
    }
    if (country) {
      where.pais = { contains: country, mode: 'insensitive' };
    }

    const [teams, total] = await Promise.all([
      this.prisma.equipo.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          nombre: 'asc',
        },
      }),
      this.prisma.equipo.count({ where }),
    ]);

    return {
      data: teams.map((team) => ({
        id: team.id.toString(),
        name: team.nombre,
        country: team.pais,
        externalReference: team.referenciaExterna,
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
    const team = await this.prisma.equipo.findUnique({
      where: { id },
      include: {
        eventosLocal: {
          include: {
            equipoLocal: true,
            equipoVisitante: true,
            liga: true,
          },
          orderBy: {
            iniciaEn: 'desc',
          },
          take: 5, // Últimos 5 partidos como local
        },
        eventosVisitante: {
          include: {
            equipoLocal: true,
            equipoVisitante: true,
            liga: true,
          },
          orderBy: {
            iniciaEn: 'desc',
          },
          take: 5, // Últimos 5 partidos como visitante
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    // Combinar y ordenar eventos
    const allEvents = [
      ...team.eventosLocal.map((event) => ({
        ...event,
        isHome: true,
      })),
      ...team.eventosVisitante.map((event) => ({
        ...event,
        isHome: false,
      })),
    ].sort((a, b) => b.iniciaEn.getTime() - a.iniciaEn.getTime());

    return {
      id: team.id.toString(),
      name: team.nombre,
      country: team.pais,
      externalReference: team.referenciaExterna,
      recentEvents: allEvents.slice(0, 10).map((event) => ({
        id: event.id.toString(),
        homeTeam: event.isHome ? team.nombre : event.equipoLocal.nombre,
        awayTeam: event.isHome ? event.equipoVisitante.nombre : team.nombre,
        league: event.liga.nombre,
        startTime: event.iniciaEn,
        isHome: event.isHome,
      })),
    };
  }

  async create(createTeamDto: CreateTeamDto) {
    const { name, country, externalReference } = createTeamDto;

    const team = await this.prisma.equipo.create({
      data: {
        nombre: name,
        pais: country ?? null,
        referenciaExterna: externalReference ?? null,
      },
    });

    this.logger.log(`Equipo creado: ${team.nombre}`);

    return {
      id: team.id.toString(),
      name: team.nombre,
      country: team.pais,
      externalReference: team.referenciaExterna,
    };
  }

  async update(id: bigint, updateTeamDto: UpdateTeamDto) {
    const { name, country, externalReference } = updateTeamDto;

    // Verificar que el equipo existe
    const existingTeam = await this.prisma.equipo.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      throw new NotFoundException('Equipo no encontrado');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.nombre = name;
    if (country !== undefined) updateData.pais = country ?? null;
    if (externalReference !== undefined) updateData.referenciaExterna = externalReference ?? null;

    const team = await this.prisma.equipo.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Equipo actualizado: ${team.nombre}`);

    return {
      id: team.id.toString(),
      name: team.nombre,
      country: team.pais,
      externalReference: team.referenciaExterna,
    };
  }

  async remove(id: bigint) {
    // Verificar que el equipo existe
    const existingTeam = await this.prisma.equipo.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      throw new NotFoundException('Equipo no encontrado');
    }

    // Verificar si tiene eventos asociados
    const eventCount = await this.prisma.evento.count({
      where: {
        OR: [
          { equipoLocalId: id },
          { equipoVisitanteId: id },
        ],
      },
    });

    if (eventCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el equipo porque tiene ${eventCount} eventos asociados`,
      );
    }

    // Eliminar equipo
    await this.prisma.equipo.delete({
      where: { id },
    });

    this.logger.log(`Equipo eliminado: ${existingTeam.nombre}`);

    return {
      message: 'Equipo eliminado exitosamente',
    };
  }

  async getTeamEvents(teamId: bigint, options: GetTeamEventsOptions) {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { equipoLocalId: teamId },
        { equipoVisitanteId: teamId },
      ],
    };

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
        isHome: event.equipoLocalId === teamId,
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

  async getCountries() {
    const countries = await this.prisma.equipo.findMany({
      select: { pais: true },
      distinct: ['pais'],
      where: {
        pais: { not: null },
      },
      orderBy: { pais: 'asc' },
    });

    return countries.map((country) => country.pais).filter(Boolean);
  }

  async searchTeams(query: string, limit: number = 10) {
    const teams = await this.prisma.equipo.findMany({
      where: {
        nombre: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: {
        nombre: 'asc',
      },
    });

    return teams.map((team) => ({
      id: team.id.toString(),
      name: team.nombre,
      country: team.pais,
    }));
  }
}
