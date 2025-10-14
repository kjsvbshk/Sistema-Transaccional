import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Betting System API',
      version: '1.0.0',
      description: 'API para sistema de apuestas deportivas con autenticación JWT y roles',
      contact: {
        name: 'API Support',
        email: 'support@bettingsystem.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa tu token JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Nombre completo del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@email.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'operator'],
              description: 'Rol del usuario en el sistema',
              example: 'user'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del usuario'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@email.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña del usuario',
              example: 'password123'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              description: 'Nombre completo del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@email.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña del usuario',
              example: 'password123'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de respuesta',
              example: 'Login successful'
            },
            token: {
              type: 'string',
              description: 'Token JWT para autenticación',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'Invalid credentials'
            }
          }
        },
        AdminDashboardResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de respuesta',
              example: 'Admin dashboard data'
            },
            users: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User'
              },
              description: 'Lista de usuarios registrados'
            },
            admin: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  example: 1
                },
                name: {
                  type: 'string',
                  example: 'Admin User'
                },
                role: {
                  type: 'string',
                  example: 'admin'
                }
              }
            }
          }
        },
        UserDashboardResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de respuesta',
              example: 'User dashboard data'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        OperatorDashboardResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de respuesta',
              example: 'Operator dashboard data'
            },
            operator: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  example: 1
                },
                name: {
                  type: 'string',
                  example: 'Operator User'
                },
                role: {
                  type: 'string',
                  example: 'operator'
                }
              }
            },
            events: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Lista de eventos (próximamente)'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Betting System API Documentation'
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
