import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.handlePrismaError(exception);
      message = this.getPrismaErrorMessage(exception);
      error = 'Database Error';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation error in database query';
      error = 'Validation Error';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Database connection error';
      error = 'Database Connection Error';
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Database engine error';
      error = 'Database Engine Error';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    // Log del error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Respuesta estructurada
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: Array.isArray(message) ? message : [message],
    };

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): number {
    switch (exception.code) {
      case 'P2002':
        return HttpStatus.CONFLICT; // Unique constraint violation
      case 'P2025':
        return HttpStatus.NOT_FOUND; // Record not found
      case 'P2003':
        return HttpStatus.BAD_REQUEST; // Foreign key constraint violation
      case 'P2014':
        return HttpStatus.BAD_REQUEST; // Invalid ID
      case 'P2016':
        return HttpStatus.BAD_REQUEST; // Query interpretation error
      case 'P2017':
        return HttpStatus.BAD_REQUEST; // Relation violation
      case 'P2018':
        return HttpStatus.BAD_REQUEST; // Required relation violation
      case 'P2019':
        return HttpStatus.BAD_REQUEST; // Input error
      case 'P2020':
        return HttpStatus.BAD_REQUEST; // Value out of range
      case 'P2021':
        return HttpStatus.NOT_FOUND; // Table does not exist
      case 'P2022':
        return HttpStatus.NOT_FOUND; // Column does not exist
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(exception: Prisma.PrismaClientKnownRequestError): string {
    switch (exception.code) {
      case 'P2002':
        return 'A record with this value already exists';
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Invalid reference to related record';
      case 'P2014':
        return 'Invalid ID provided';
      case 'P2016':
        return 'Query interpretation error';
      case 'P2017':
        return 'Relation violation';
      case 'P2018':
        return 'Required relation violation';
      case 'P2019':
        return 'Input validation error';
      case 'P2020':
        return 'Value out of range';
      case 'P2021':
        return 'Table does not exist';
      case 'P2022':
        return 'Column does not exist';
      default:
        return 'Database operation failed';
    }
  }
}
