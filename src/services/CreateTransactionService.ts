import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // Valida se o type veio informado corretamente
    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('Invalid transaction type!');
    }

    const { total } = await (await transactionsRepository.getBalance()).balance;

    if (type === 'outcome' && value > total) {
      throw new AppError('Insufficient funds!');
    }

    // Instancia um repositório de Category
    const categoriesRepository = getRepository(Category);

    // Verifico se já existe uma category criada com o nome informado
    // e salvo ela na variável dbCategory
    let categoryInDatabase = await categoriesRepository.findOne({
      where: { title: category },
    });

    // Se não existir no banco a categoria, crio ela
    if (!categoryInDatabase) {
      categoryInDatabase = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(categoryInDatabase);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: categoryInDatabase,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
