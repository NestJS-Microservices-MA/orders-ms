import { IsEnum, IsString, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';

import { OrderStatusList } from '../enum/order.enum';

export class UpdateOrderStatusDto {
  @IsString()
  @IsUUID(4)
  uuid: string;

  @IsEnum(OrderStatusList, {
    message: `Status must be one of the following: ${OrderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}
