import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // Procura a transação pelo ID no banco
    const transaction = await transactionsRepository.findOne(id);

    // Se não achar, retorna erro
    if (!transaction) {
      throw new AppError('No transaction found with informed ID!', 404);
    }

    // Deleta a transação encontrada
    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
