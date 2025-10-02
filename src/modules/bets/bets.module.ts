import { Module } from '@nestjs/common';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';
import { IdempotencyService } from './services/idempotency.service';
import { OddsService } from './services/odds.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [BetsController],
  providers: [BetsService, IdempotencyService, OddsService],
  exports: [BetsService, IdempotencyService, OddsService],
})
export class BetsModule {}
