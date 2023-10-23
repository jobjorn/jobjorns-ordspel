import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { startGame } from './games';
import { getUser } from 'services/authorization';
import { UserFromAuth0Input, UserFromAuth0InputSchema } from 'types/types';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const addUser = async (user: UserFromAuth0Input) => {
  try {
    const findSingleUser = await prisma.user.findUnique({
      where: { sub: user.sub }
    });
    if (findSingleUser !== null) {
      return { message: 'Användaren finns redan' };
    }

    const createResult = await prisma.user.create({
      data: {
        sub: user.sub,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    });

    // Add an invitation from the creator to the new user
    const starter = process.env.CREATOR_SUB;
    if (!starter) throw new Error('No CREATOR_SUB env variable');

    startGame(starter, [createResult], []);

    return { message: `Spel skapades med användaren ${user.name}` };
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const listUsers = async () => {
  // används i dagsläget endast på "Nytt spel"-sidan
  try {
    const listUsersPrisma = await prisma.user.findMany({
      select: {
        name: true,
        picture: true,
        sub: true
      },
      where: {
        settingVisibility: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    if (listUsersPrisma.length === 0) {
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

const users = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    // OBS: denna kallas tidvis från Auth0
    try {
      const parsedInputUser = UserFromAuth0InputSchema.safeParse(req.body);
      if (!parsedInputUser.success) {
        throw new Error(parsedInputUser.error.message);
      }

      const result = await addUser(parsedInputUser.data);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else if (req.method === 'GET') {
    // endast tillåtet om man är inloggad
    const loggedInUser = await getUser(req, res);
    if (loggedInUser === null) {
      res.status(401).end();
      await prisma.$disconnect();
      return;
    }
    try {
      const result = await listUsers();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else {
    res.status(404).end();
  }

  await prisma.$disconnect();
  return;
};

export default users;
