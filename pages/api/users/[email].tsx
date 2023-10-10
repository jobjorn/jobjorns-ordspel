import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const getUser = async (email: string) => {
  try {
    const findSingleUser = await prisma.user.findUnique({
      where: { email: email }
    });
    if (findSingleUser) {
      return {
        message: 'Det gick bra, här är användaren',
        data: findSingleUser
      };
    } else {
      return { message: 'Något gick fel i hämtandet av användare' };
    }
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

interface UserEmail {
  email: string;
}

const user = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'GET') {
    const { email } = req.query as unknown as UserEmail;

    return new Promise((resolve) => {
      getUser(email)
        .then((result) => {
          res.status(200).json(result);
          resolve();
        })
        .catch((error) => {
          res.status(500).end(error);
          resolve();
        })
        .finally(async () => {
          await prisma.$disconnect();
        });
    });
  } else {
    res.status(404).end();
  }
};

export default user;
