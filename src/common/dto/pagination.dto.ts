import { OrderStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsOptional, IsPositive, IsEnum } from "class-validator";

import { OrderStatusList } from "src/orders/enum/order.enum";

export class PaginationDto {
    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 10;

    @IsOptional()
    @IsEnum(OrderStatusList, {
        message: `status must be one of the following values: ${OrderStatusList.join(', ')}`
    })
    status: OrderStatus;
}
