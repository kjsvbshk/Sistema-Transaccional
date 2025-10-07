import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface OddsData {
  precio: number;
  probabilidadImplicita: number;
  proveedor: string;
  timestamp: Date;
}

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentOdds(eventId: bigint, marketId: bigint, selection: string): Promise<OddsData | null> {
    // Por ahora, generamos cuotas mock
    // En un sistema real, esto consultaría proveedores externos
    return this.generateMockOdds(eventId, marketId, selection);
  }

  async getEventOdds(eventId: bigint) {
    const event = await this.prisma.evento.findUnique({
      where: { id: eventId },
      include: {
        mercados: {
          where: { estado: 'abierto' },
        },
      },
    });

    if (!event) {
      return null;
    }

    const odds: Record<string, any> = {};

    for (const market of event.mercados) {
      odds[market.tipoMercado] = await this.generateMarketOdds(market.tipoMercado);
    }

    return odds;
  }

  private async generateMockOdds(_eventId: bigint, _marketId: bigint, selection: string): Promise<OddsData> {
    // Generar cuotas mock basadas en el tipo de mercado y selección
    const baseOdds = this.getBaseOddsForSelection(selection);
    const variation = (Math.random() - 0.5) * 0.2; // ±10% de variación
    const finalOdds = Math.max(1.01, baseOdds + variation);

    return {
      precio: Number(finalOdds.toFixed(4)),
      probabilidadImplicita: Number((1 / finalOdds).toFixed(4)),
      proveedor: 'mock_provider',
      timestamp: new Date(),
    };
  }

  private async generateMarketOdds(marketType: string) {
    const marketOdds = {
      '1X2': {
        '1': this.generateMockOdds(BigInt(1), BigInt(1), '1'),
        'X': this.generateMockOdds(BigInt(1), BigInt(1), 'X'),
        '2': this.generateMockOdds(BigInt(1), BigInt(1), '2'),
      },
      'Over/Under': {
        'Over 2.5': this.generateMockOdds(BigInt(1), BigInt(1), 'Over 2.5'),
        'Under 2.5': this.generateMockOdds(BigInt(1), BigInt(1), 'Under 2.5'),
      },
      'Both Teams to Score': {
        'Yes': this.generateMockOdds(BigInt(1), BigInt(1), 'Yes'),
        'No': this.generateMockOdds(BigInt(1), BigInt(1), 'No'),
      },
      'Correct Score': {
        '1-0': this.generateMockOdds(BigInt(1), BigInt(1), '1-0'),
        '2-0': this.generateMockOdds(BigInt(1), BigInt(1), '2-0'),
        '2-1': this.generateMockOdds(BigInt(1), BigInt(1), '2-1'),
        '0-0': this.generateMockOdds(BigInt(1), BigInt(1), '0-0'),
      },
    };

    return (marketOdds as any)[marketType] || {};
  }

  private getBaseOddsForSelection(selection: string): number {
    const baseOddsMap = {
      // 1X2
      '1': 2.1,
      'X': 3.2,
      '2': 3.5,
      
      // Over/Under
      'Over 2.5': 1.8,
      'Under 2.5': 2.0,
      'Over 1.5': 1.3,
      'Under 1.5': 3.4,
      
      // Both Teams to Score
      'Yes': 1.7,
      'No': 2.1,
      
      // Correct Score
      '1-0': 8.5,
      '2-0': 12.0,
      '2-1': 9.5,
      '0-0': 11.0,
      '1-1': 6.5,
      '3-0': 25.0,
      '3-1': 20.0,
      '3-2': 35.0,
      
      // Handicap
      'Home -1': 2.8,
      'Home +1': 1.4,
      'Away -1': 2.6,
      'Away +1': 1.5,
    };

    return (baseOddsMap as any)[selection] || 2.0; // Default odds
  }

  async collectOddsFromProviders(eventId: bigint, marketId: bigint) {
    // En un sistema real, esto consultaría múltiples proveedores
    // y almacenaría las cuotas en la base de datos
    
    this.logger.log(`Collecting odds for event ${eventId}, market ${marketId}`);
    
    // Simular recolección de cuotas de múltiples proveedores
    const providers = ['provider1', 'provider2', 'provider3'];
    const odds = [];

    for (const provider of providers) {
      const providerOdds = await this.generateProviderOdds(provider, eventId, marketId);
      odds.push(providerOdds);
    }

    return odds;
  }

  private async generateProviderOdds(provider: string, eventId: bigint, marketId: bigint) {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    const selections = ['1', 'X', '2', 'Over 2.5', 'Under 2.5'];
    const odds: Record<string, any> = {};

    for (const selection of selections) {
      const baseOdds = this.getBaseOddsForSelection(selection);
      const providerVariation = (Math.random() - 0.5) * 0.1; // ±5% por proveedor
      const finalOdds = Math.max(1.01, baseOdds + providerVariation);

      odds[selection] = {
        precio: Number(finalOdds.toFixed(4)),
        probabilidadImplicita: Number((1 / finalOdds).toFixed(4)),
        proveedor: provider,
        timestamp: new Date(),
      };
    }

    return {
      provider,
      eventId: eventId.toString(),
      marketId: marketId.toString(),
      odds,
      collectedAt: new Date(),
    };
  }
}
