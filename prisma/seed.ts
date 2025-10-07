import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear organización por defecto
  const defaultOrg = await prisma.organizacion.upsert({
    where: { nombre: 'Default Organization' },
    update: {},
    create: {
      nombre: 'Default Organization',
      estado: 'activa',
    },
  });

  console.log('✅ Organización por defecto creada');

  // Crear roles
  const adminRole = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: {
      nombre: 'admin',
      descripcion: 'Administrador del sistema',
    },
  });

  const userRole = await prisma.rol.upsert({
    where: { nombre: 'user' },
    update: {},
    create: {
      nombre: 'user',
      descripcion: 'Usuario regular',
    },
  });

  console.log('✅ Roles creados');

  // Crear permisos
  const permissions = [
    { codigo: 'users.create', descripcion: 'Crear usuarios' },
    { codigo: 'users.read', descripcion: 'Leer usuarios' },
    { codigo: 'users.update', descripcion: 'Actualizar usuarios' },
    { codigo: 'users.delete', descripcion: 'Eliminar usuarios' },
    { codigo: 'bets.create', descripcion: 'Crear apuestas' },
    { codigo: 'bets.read', descripcion: 'Leer apuestas' },
    { codigo: 'bets.cancel', descripcion: 'Cancelar apuestas' },
    { codigo: 'wallet.read', descripcion: 'Leer billetera' },
    { codigo: 'wallet.deposit', descripcion: 'Depositar dinero' },
    { codigo: 'wallet.withdraw', descripcion: 'Retirar dinero' },
    { codigo: 'events.create', descripcion: 'Crear eventos' },
    { codigo: 'events.read', descripcion: 'Leer eventos' },
    { codigo: 'events.update', descripcion: 'Actualizar eventos' },
    { codigo: 'events.delete', descripcion: 'Eliminar eventos' },
    { codigo: 'leagues.create', descripcion: 'Crear ligas' },
    { codigo: 'leagues.read', descripcion: 'Leer ligas' },
    { codigo: 'leagues.update', descripcion: 'Actualizar ligas' },
    { codigo: 'leagues.delete', descripcion: 'Eliminar ligas' },
    { codigo: 'teams.create', descripcion: 'Crear equipos' },
    { codigo: 'teams.read', descripcion: 'Leer equipos' },
    { codigo: 'teams.update', descripcion: 'Actualizar equipos' },
    { codigo: 'teams.delete', descripcion: 'Eliminar equipos' },
  ];

  for (const permission of permissions) {
    await prisma.permiso.upsert({
      where: { codigo: permission.codigo },
      update: {},
      create: permission,
    });
  }

  console.log('✅ Permisos creados');

  // Asignar todos los permisos al rol admin
  for (const permission of permissions) {
    const perm = await prisma.permiso.findUnique({
      where: { codigo: permission.codigo },
    });

    if (perm) {
      await prisma.rolesPermisos.upsert({
        where: {
          roles_permisos_unicos: {
            rolId: adminRole.id,
            permisoId: perm.id,
          },
        },
        update: {},
        create: {
          rolId: adminRole.id,
          permisoId: perm.id,
        },
      });
    }
  }

  // Asignar permisos básicos al rol user
  const userPermissions = ['bets.create', 'bets.read', 'bets.cancel', 'wallet.read', 'wallet.deposit', 'wallet.withdraw', 'events.read', 'leagues.read', 'teams.read'];
  for (const permissionCode of userPermissions) {
    const perm = await prisma.permiso.findUnique({
      where: { codigo: permissionCode },
    });

    if (perm) {
      await prisma.rolesPermisos.upsert({
        where: {
          roles_permisos_unicos: {
            rolId: userRole.id,
            permisoId: perm.id,
          },
        },
        update: {},
        create: {
          rolId: userRole.id,
          permisoId: perm.id,
        },
      });
    }
  }

  console.log('✅ Permisos asignados a roles');

  // Crear usuario administrador
  const adminPassword = await argon2.hash('Admin123!');
  const adminUser = await prisma.usuario.upsert({
    where: { correo: 'admin@betting.com' },
    update: {},
    create: {
      correo: 'admin@betting.com',
      nombre: 'Administrador',
      contrasenaHash: adminPassword,
      estado: 'activo',
    },
  });

  // Crear billetera para admin
  await prisma.billetera.upsert({
    where: { usuarioId: adminUser.id },
    update: {},
    create: {
      usuarioId: adminUser.id,
      saldoDolares: 10000.00, // $10,000 para admin
    },
  });

  // Asignar admin a la organización
  await prisma.membresia.upsert({
    where: {
      membresias_unicas: {
        organizacionId: defaultOrg.id,
        usuarioId: adminUser.id,
      },
    },
    update: {},
    create: {
      organizacionId: defaultOrg.id,
      usuarioId: adminUser.id,
      rolDefaultId: adminRole.id,
    },
  });

  console.log('✅ Usuario administrador creado');

  // Crear usuario de prueba
  const testPassword = await argon2.hash('Test123!');
  const testUser = await prisma.usuario.upsert({
    where: { correo: 'test@betting.com' },
    update: {},
    create: {
      correo: 'test@betting.com',
      nombre: 'Usuario de Prueba',
      contrasenaHash: testPassword,
      estado: 'activo',
    },
  });

  // Crear billetera para usuario de prueba
  await prisma.billetera.upsert({
    where: { usuarioId: testUser.id },
    update: {},
    create: {
      usuarioId: testUser.id,
      saldoDolares: 500.00, // $500 para usuario de prueba
    },
  });

  // Asignar usuario de prueba a la organización
  await prisma.membresia.upsert({
    where: {
      membresias_unicas: {
        organizacionId: defaultOrg.id,
        usuarioId: testUser.id,
      },
    },
    update: {},
    create: {
      organizacionId: defaultOrg.id,
      usuarioId: testUser.id,
      rolDefaultId: userRole.id,
    },
  });

  console.log('✅ Usuario de prueba creado');

  // Crear ligas
  const leagues = [
    { deporte: 'Fútbol', nombre: 'Premier League', pais: 'Inglaterra' },
    { deporte: 'Fútbol', nombre: 'La Liga', pais: 'España' },
    { deporte: 'Fútbol', nombre: 'Serie A', pais: 'Italia' },
    { deporte: 'Fútbol', nombre: 'Bundesliga', pais: 'Alemania' },
    { deporte: 'Fútbol', nombre: 'Ligue 1', pais: 'Francia' },
    { deporte: 'Basketball', nombre: 'NBA', pais: 'Estados Unidos' },
    { deporte: 'Basketball', nombre: 'EuroLeague', pais: 'Europa' },
    { deporte: 'Tennis', nombre: 'ATP Tour', pais: 'Mundial' },
    { deporte: 'Tennis', nombre: 'WTA Tour', pais: 'Mundial' },
  ];

  for (const league of leagues) {
    await prisma.liga.upsert({
      where: {
        ligas_unicas: {
          deporte: league.deporte,
          nombre: league.nombre,
        },
      },
      update: {},
      create: league,
    });
  }

  console.log('✅ Ligas creadas');

  // Crear equipos de fútbol
  const footballTeams = [
    { nombre: 'Manchester United', pais: 'Inglaterra' },
    { nombre: 'Manchester City', pais: 'Inglaterra' },
    { nombre: 'Liverpool', pais: 'Inglaterra' },
    { nombre: 'Chelsea', pais: 'Inglaterra' },
    { nombre: 'Arsenal', pais: 'Inglaterra' },
    { nombre: 'Real Madrid', pais: 'España' },
    { nombre: 'Barcelona', pais: 'España' },
    { nombre: 'Atlético Madrid', pais: 'España' },
    { nombre: 'Sevilla', pais: 'España' },
    { nombre: 'Juventus', pais: 'Italia' },
    { nombre: 'AC Milan', pais: 'Italia' },
    { nombre: 'Inter Milan', pais: 'Italia' },
    { nombre: 'Bayern Munich', pais: 'Alemania' },
    { nombre: 'Borussia Dortmund', pais: 'Alemania' },
    { nombre: 'PSG', pais: 'Francia' },
  ];

  for (const team of footballTeams) {
    try {
      await prisma.equipo.create({
        data: team,
      });
    } catch (error) {
      // Ignorar errores de duplicados
      console.log(`Equipo ${team.nombre} ya existe`);
    }
  }

  console.log('✅ Equipos de fútbol creados');

  // Crear equipos de basketball
  const basketballTeams = [
    { nombre: 'Lakers', pais: 'Estados Unidos' },
    { nombre: 'Warriors', pais: 'Estados Unidos' },
    { nombre: 'Celtics', pais: 'Estados Unidos' },
    { nombre: 'Heat', pais: 'Estados Unidos' },
    { nombre: 'Bulls', pais: 'Estados Unidos' },
    { nombre: 'Real Madrid', pais: 'España' },
    { nombre: 'Barcelona', pais: 'España' },
    { nombre: 'CSKA Moscow', pais: 'Rusia' },
  ];

  for (const team of basketballTeams) {
    try {
      await prisma.equipo.create({
        data: team,
      });
    } catch (error) {
      // Ignorar errores de duplicados
      console.log(`Equipo ${team.nombre} ya existe`);
    }
  }

  console.log('✅ Equipos de basketball creados');

  // Crear algunos eventos de ejemplo
  const premierLeague = await prisma.liga.findFirst({
    where: { nombre: 'Premier League' },
  });

  const manUnited = await prisma.equipo.findFirst({
    where: { nombre: 'Manchester United' },
  });

  const manCity = await prisma.equipo.findFirst({
    where: { nombre: 'Manchester City' },
  });

  const liverpool = await prisma.equipo.findFirst({
    where: { nombre: 'Liverpool' },
  });

  if (premierLeague && manUnited && manCity && liverpool) {
    // Evento pasado
    await prisma.evento.upsert({
      where: {
        eventos_unicos: {
          ligaId: premierLeague.id,
          equipoLocalId: manUnited.id,
          equipoVisitanteId: manCity.id,
          iniciaEn: new Date('2024-01-01T15:00:00Z'),
        },
      },
      update: {},
      create: {
        ligaId: premierLeague.id,
        equipoLocalId: manUnited.id,
        equipoVisitanteId: manCity.id,
        iniciaEn: new Date('2024-01-01T15:00:00Z'),
        referenciaExterna: 'premier_manu_mancity_20240101',
      },
    });

    // Evento futuro
    const futureEvent = await prisma.evento.upsert({
      where: {
        eventos_unicos: {
          ligaId: premierLeague.id,
          equipoLocalId: liverpool.id,
          equipoVisitanteId: manUnited.id,
          iniciaEn: new Date('2024-12-25T17:30:00Z'),
        },
      },
      update: {},
      create: {
        ligaId: premierLeague.id,
        equipoLocalId: liverpool.id,
        equipoVisitanteId: manUnited.id,
        iniciaEn: new Date('2024-12-25T17:30:00Z'),
        referenciaExterna: 'premier_liverpool_manu_20241225',
      },
    });

    // Crear mercados para el evento futuro
    const markets = [
      { tipo: '1X2', parametros: {} },
      { tipo: 'Over/Under', parametros: { total: '2.5' } },
      { tipo: 'Both Teams to Score', parametros: {} },
      { tipo: 'Correct Score', parametros: {} },
    ];

    for (const market of markets) {
      const createdMarket = await prisma.mercado.create({
        data: {
          eventoId: futureEvent.id,
          tipoMercado: market.tipo,
          estado: 'abierto',
        },
      });

      // Crear parámetros del mercado
      if (Object.keys(market.parametros).length > 0) {
        await prisma.parametroMercado.createMany({
          data: Object.entries(market.parametros).map(([clave, valor]) => ({
            mercadoId: createdMarket.id,
            clave,
            valor: String(valor),
          })),
        });
      }
    }

    console.log('✅ Eventos de ejemplo creados');
  }

  // Crear proveedores mock
  const providers = [
    { nombre: 'Mock Provider 1', urlBase: 'https://mock-provider-1.com' },
    { nombre: 'Mock Provider 2', urlBase: 'https://mock-provider-2.com' },
    { nombre: 'Mock Provider 3', urlBase: 'https://mock-provider-3.com' },
  ];

  for (const provider of providers) {
    await prisma.proveedor.upsert({
      where: { nombre: provider.nombre },
      update: {},
      create: provider,
    });
  }

  console.log('✅ Proveedores mock creados');

  // Crear versión de modelo
  await prisma.versionModelo.upsert({
    where: { version: 'v1.0' },
    update: {},
    create: {
      version: 'v1.0',
      desplegadoEn: new Date(),
      metadata: {
        description: 'Modelo inicial de predicción',
        accuracy: 0.75,
        features: ['historical_data', 'team_form', 'head_to_head'],
      },
    },
  });

  console.log('✅ Versión de modelo creada');

  console.log('🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('👤 Admin: admin@betting.com / Admin123!');
  console.log('👤 Usuario: test@betting.com / Test123!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
