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

import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de equipos' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Término de búsqueda' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Filtrar por país' })
  @ApiResponse({
    status: 200,
    description: 'Lista de equipos obtenida exitosamente',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('country') country?: string,
  ) {
    const options: any = { page, limit };
    if (search) options.search = search;
    if (country) options.country = country;
    
    return this.teamsService.findAll(options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener equipo por ID' })
  @ApiResponse({
    status: 200,
    description: 'Equipo encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipo no encontrado',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findOne(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo equipo' })
  @ApiResponse({
    status: 201,
    description: 'Equipo creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  async create(@Body(ValidationPipe) createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar equipo' })
  @ApiResponse({
    status: 200,
    description: 'Equipo actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipo no encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(BigInt(id), updateTeamDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar equipo' })
  @ApiResponse({
    status: 200,
    description: 'Equipo eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipo no encontrado',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.remove(BigInt(id));
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Obtener eventos de un equipo' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por estado: upcoming, live, finished' })
  @ApiResponse({
    status: 200,
    description: 'Eventos del equipo obtenidos exitosamente',
  })
  async getTeamEvents(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    const options: any = { page, limit };
    if (status) options.status = status;
    
    return this.teamsService.getTeamEvents(BigInt(id), options);
  }
}
