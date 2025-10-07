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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener lista de usuarios' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Término de búsqueda' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  async findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
  ) {
    // Validar que page y limit sean números válidos
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validLimit = isNaN(limit) || limit < 1 ? 10 : limit;
    
    return this.usersService.findAll({ 
      page: validPage, 
      limit: validLimit, 
      search 
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(BigInt(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
  })
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(BigInt(id), updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(BigInt(id));
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Asignar rol a usuario' })
  @ApiResponse({
    status: 200,
    description: 'Rol asignado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario o rol no encontrado',
  })
  async assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) assignRoleDto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(BigInt(id), BigInt(assignRoleDto.roleId));
  }

  @Delete(':id/roles/:roleId')
  @ApiOperation({ summary: 'Remover rol de usuario' })
  @ApiResponse({
    status: 200,
    description: 'Rol removido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario o rol no encontrado',
  })
  async removeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.usersService.removeRole(BigInt(id), BigInt(roleId));
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Obtener roles del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Roles del usuario obtenidos exitosamente',
  })
  async getUserRoles(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserRoles(BigInt(id));
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente',
  })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }
}
