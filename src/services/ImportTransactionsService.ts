import csvParse from 'csv-parse';
import fs from 'fs';
import { In, getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // Faz a leitura do arquivo para o stream
    const readStream = fs.createReadStream(filePath);

    // Configura o csvParse para ler a partir da segunda linha do arquivo
    // pois a primeira contém os títulos
    const parsers = csvParse({
      from_line: 2,
    });

    // Aplica as configs do parseCSV na leitura
    const parseCSV = readStream.pipe(parsers);

    // Array para armanezar as transactions do CSV
    const transactions: CSVTransaction[] = [];

    // Array para armazenar as categories do CSV
    const categories: string[] = [];

    // Vai ler cada linha do CSV
    // O Trim é pra remover os espaços nos textos de cada célula
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // Se não houver alguma das informações necessárias, sai do método
      if (!title || !type || !value) return;

      // Insere no array temporário de categorias a category que foi lida
      categories.push(category);

      // Insere no array temporário de transações a transaction que foi lida
      transactions.push({ title, type, value, category });
    });

    // Espera até finalizar a leitura do CSV
    await new Promise(resolve => parseCSV.on('end', resolve));

    // Faz um SELECT usando IN no title da categoria, para verificar quais
    // já existem no banco
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    // Filtra o array de categorias retornando somente os títulos das existentes
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => {
        return category.title;
      },
    );

    // Filtramos o array de existentes removendo as existentes e deixando
    // somente as novas
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    // Cria as novas categorias mapeando o título delas
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    // Salva as novas categorias no banco
    await categoriesRepository.save(newCategories);

    // Usando o spread vamos concatenar as novas categorias com as já existentes
    const finalCategories = [...newCategories, ...existentCategories];

    // Criação do objeto transaction para cada item do CSV
    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        // Mapeia a categoria da transaction se o nome dela for igual ao das
        // categorias finais
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    // Salva as transactions no banco de dados
    await transactionRepository.save(createdTransactions);

    // Deleta o arquivo da pasta tmp no final do processo
    await fs.promises.unlink(filePath);

    // Retorna as transações criadas
    return createdTransactions;
  }
}

export default ImportTransactionsService;
