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

import { LeaguesService } from './leagues.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';

@ApiTags('Leagues')
@Controller('leagues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de ligas' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados por página' })
  @ApiQuery({ name: 'sport', required: false, type: String, description: 'Filtrar por deporte' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Filtrar por país' })
  @ApiResponse({
    status: 200,
    description: 'Lista de ligas obtenida exitosamente',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sport') sport?: string,
    @Query('country') country?: string,
  ) {
    const options: any = { page, limit };
    if (sport) options.sport = sport;
    if (country) options.country = country;
    
    return this.leaguesService.findAll(options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener liga por ID' })
  @ApiResponse({
    status: 200,
    description: 'Liga encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Liga no encontrada',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leaguesService.findOne(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva liga' })
  @ApiResponse({
    status: 201,
    description: 'Liga creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'La liga ya existe',
  })
  async create(@Body(ValidationPipe) createLeagueDto: CreateLeagueDto) {
    return this.leaguesService.create(createLeagueDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar liga' })
  @ApiResponse({
    status: 200,
    description: 'Liga actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Liga no encontrada',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateLeagueDto: UpdateLeagueDto,
  ) {
    return this.leaguesService.update(BigInt(id), updateLeagueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar liga' })
  @ApiResponse({
    status: 200,
    description: 'Liga eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Liga no encontrada',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.leaguesService.remove(BigInt(id));
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Obtener eventos de una liga' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por estado: upcoming, live, finished' })
  @ApiResponse({
    status: 200,
    description: 'Eventos de la liga obtenidos exitosamente',
  })
  async getLeagueEvents(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    const options: any = { page, limit };
    if (status) options.status = status;
    
    return this.leaguesService.getLeagueEvents(BigInt(id), options);
  }
}
