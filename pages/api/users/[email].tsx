import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser as getAuthedUser } from 'services/authorization';

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

const user = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // endast tillåtet om man är inloggad
    const loggedInUser = await getAuthedUser(req, res);
    if (loggedInUser === null) {
      res.status(401).end();
      await prisma.$disconnect();
      return;
    }

    const { email } = req.query as unknown as UserEmail;

    try {
      const result = await getUser(email);
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).end('Något gick fel.');
    }
  } else {
    res.status(404).end();
  }

  await prisma.$disconnect();
  return;
};

export default user;
