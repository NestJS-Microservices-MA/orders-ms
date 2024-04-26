import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PRODUCT_SERVICE } from 'src/config/services';
import { envs } from 'src/config';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    ClientsModule.register([{
      name: PRODUCT_SERVICE,
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
      },
    }]),
  ],
})
export class OrdersModule {}
