import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { startGame } from './games';

interface User {
  sub: string;
  name: string;
  picture: string;
  email: string;
}

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const addUser = async (user: User) => {
  try {
    const findSingleUser = await prisma.user.findUnique({
      where: { sub: user.sub }
    });

    if (findSingleUser === null) {
      const createResult = await prisma.user.create({
        data: {
          sub: user.sub,
          name: user.name,
          email: user.email,
          picture: user.picture
        }
      });
      if (createResult !== null) {
        // Add an invitation from the creator to the new user
        const starter = 'google-oauth2|104137162787605911168';
        const createGame = startGame(starter, [createResult], []);
        if (createGame !== null) {
          return { message: `Spelet skapades` };
        } else {
          throw new Error(
            'Något gick fel i skapandet av spelomgång, createResult var null'
          );
        }

        return { message: `Användaren ${user.name} skapades` };
      } else {
        return { message: 'Något gick fel i skapandet av användare' };
      }
    } else {
      return { message: 'Användaren finns redan' };
    }
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const listUsers = async () => {
  try {
    const listUsersPrisma = await prisma.user.findMany({
      where: {
        settingVisibility: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    if (listUsersPrisma === null) {
      return { message: 'Inga användare returnerades' };
    } else {
      return {
        message: 'Det gick bra, här är användarna',
        data: listUsersPrisma
      };
    }
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const users = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'POST') {
    return new Promise((resolve) => {
      const { sub, name, picture, email }: User = req.body;

      addUser({
        sub,
        name,
        picture,
        email
      })
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
  } else if (req.method === 'GET') {
    return new Promise((resolve) => {
      listUsers()
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

export default users;
