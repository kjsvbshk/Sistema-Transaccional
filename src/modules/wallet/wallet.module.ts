import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TransactionsService } from './services/transactions.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, TransactionsService],
  exports: [WalletService, TransactionsService],
})
export class WalletModule {}
