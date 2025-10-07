import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de eventos' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados por página' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por estado: upcoming, live, finished' })
  @ApiQuery({ name: 'league', required: false, type: Number, description: 'Filtrar por liga' })
  @ApiQuery({ name: 'team', required: false, type: Number, description: 'Filtrar por equipo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos obtenida exitosamente',
  })
  async findAll(
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
    @Query('status') status?: string,
    @Query('league') leagueParam?: string,
    @Query('team') teamParam?: string,
  ) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const league = leagueParam ? parseInt(leagueParam, 10) : undefined;
    const team = teamParam ? parseInt(teamParam, 10) : undefined;
    
    const options: any = { page, limit };
    if (status) options.status = status;
    if (league) options.league = league;
    if (team) options.team = team;
    
    return this.eventsService.findAll(options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener evento por ID' })
  @ApiResponse({
    status: 200,
    description: 'Evento encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo evento' })
  @ApiResponse({
    status: 201,
    description: 'Evento creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Liga o equipos no encontrados',
  })
  async create(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar evento' })
  @ApiResponse({
    status: 200,
    description: 'Evento actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(BigInt(id), updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar evento' })
  @ApiResponse({
    status: 200,
    description: 'Evento eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.remove(BigInt(id));
  }

  @Get(':id/markets')
  @ApiOperation({ summary: 'Obtener mercados de un evento' })
  @ApiResponse({
    status: 200,
    description: 'Mercados del evento obtenidos exitosamente',
  })
  async getEventMarkets(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.getEventMarkets(BigInt(id));
  }

  @Post(':id/markets')
  @ApiOperation({ summary: 'Crear mercado para un evento' })
  @ApiResponse({
    status: 201,
    description: 'Mercado creado exitosamente',
  })
  async createMarket(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) createMarketDto: any,
  ) {
    return this.eventsService.createMarket(BigInt(id), createMarketDto);
  }
}
