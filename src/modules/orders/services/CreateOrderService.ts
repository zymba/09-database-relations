import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists.');
    }

    const allProducts = await this.productsRepository.findAllById(products);

    if (!allProducts.length) {
      throw new AppError('One or more products was not found.');
    }

    const productsToDB = allProducts.map(dbProduct => {
      const findProduct = products.find(product => product.id === dbProduct.id);

      if (!findProduct) {
        throw new AppError('One or more products was not found.');
      }

      if (findProduct && findProduct.quantity > dbProduct.quantity) {
        throw new AppError('One or more products are out of stock.');
      }

      return {
        product_id: dbProduct.id,
        price: dbProduct.price,
        quantity: findProduct.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsToDB,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
