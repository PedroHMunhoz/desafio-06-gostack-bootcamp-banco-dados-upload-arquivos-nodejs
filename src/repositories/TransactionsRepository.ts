import { EntityRepository, Repository, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

// Interface criada para montagem do objeto que retornará o array de
// Transactions e o objeto Balance juntos
interface Total {
  transactions: Transaction[];
  balance: Balance;
}

interface TransactionsWithCategory {
  transaction: Transaction;
  category: { id: string; title: string };
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Total> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactions = await transactionsRepository
      .createQueryBuilder('transactions')
      .select([
        'transactions.id',
        'transactions.title',
        'transactions.value',
        'transactions.type',
        'category.id',
        'category.title',
      ])
      .innerJoin('transactions.category', 'category')
      .getMany();

    // Cálculo do totalizador, conforme os valores passados
    const calculateTotal = (
      amount: number,
      { value: currentValue }: Transaction,
    ): number => {
      return amount + currentValue;
    };

    // Para calcular o Income e Outcome, é feito um filter no array e
    // com ele filtrado, usando o reduce é efetuado o calculo.
    // O Reduce aqui recebe como parâmetro a função calculateTotal que itera
    // os dados do array filtrado

    // Calculo de Entradas
    const income = transactions
      .filter(item => item.type === 'income')
      .reduce(calculateTotal, 0);

    // Calculo de Saídas
    const outcome = transactions
      .filter(item => item.type === 'outcome')
      .reduce(calculateTotal, 0);

    // Aqui calculo o total de Entradas - Saídas
    const total = income - outcome;

    return {
      transactions,
      balance: {
        income,
        outcome,
        total,
      },
    };
  }
}

export default TransactionsRepository;
