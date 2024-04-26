import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateOrderStatusDto } from './dto';
import { PRODUCT_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DB initialized.');
  }

  async create(createOrderDto: CreateOrderDto) {
    const productIds = createOrderDto.items.map((product) => product.productId);

    try {
      // Validate products by ids
      const products = await firstValueFrom(
        this.productClient.send({ cmd: 'validate_products' }, productIds),
      );

      // Calculate values
      const totalAmount = createOrderDto.items.reduce((acc, orderItem)=> {
        const price = products.find((product) => product.id === orderItem.productId);
        return acc + price.price * orderItem.quantity;
      }, 0);

      const totalQuantity = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      // Create DB order and order items
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems: totalQuantity,
          orderItems: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find((product) => product.id === orderItem.productId).price,
                quantity: orderItem.quantity,
                productId: orderItem.productId,
              })),
            }
          }
        },
        include: {
          orderItems: {
            select: {
              productId: true,
              price: true,
              quantity: true,
            }
          },
        }
      });

      return {
        ...order,
        orderItems: order.orderItems.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId).name,
        })),
      };

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, status } = paginationDto;
    const totalResults = await this.order.count({
      where: { status }
    });
    const lastPage = Math.ceil(totalResults / limit);

    return {
      data: await this.order.findMany({
        where: {
          status,
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      meta: {
        total: totalResults,
        page,
        lastPage,
      },
    };
  }

  async findOne(uuid: string) {
    const order = await this.order.findFirst(
      { where: { id: uuid }, include: { orderItems: {
        select: {
          productId: true,
          price: true,
          quantity: true,
        }
      } } },
    );

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with uuid #${uuid} not found`,
      });
    }

    const productIds = order.orderItems.map((orderItem) => orderItem.productId);
    const products = await firstValueFrom(
      this.productClient.send({ cmd: 'validate_products' }, productIds),
    );

    return {
      ...order,
      orderItems: order.orderItems.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId).name,
      })),
    };
  }

  async updateOrderStatus(updateOrderStatusDto: UpdateOrderStatusDto) {
    const { uuid, status } = updateOrderStatusDto;

    const order = await this.findOne(uuid);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id: uuid },
      data: { status },
    });
  }
}
