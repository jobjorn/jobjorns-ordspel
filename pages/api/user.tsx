import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, User } from '@prisma/client';
import { getUser } from 'services/authorization';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const updateUser = async (user: User) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { sub: user.sub },
      data: {
        settingVisibility: user.settingVisibility,
        receiveReminders: user.receiveReminders
      }
    });

    return updatedUser;
  } catch (error) {
    throw new Error(error as string);
  }
};

const users = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    const loggedInUser = await getUser(req, res);
    const user: User = req.body.user;
    if (loggedInUser?.sub !== user.sub || loggedInUser === null) {
      res.status(401).end('Unauthorized.');
      await prisma.$disconnect();
      return;
    }

    try {
      const result = await updateUser(user);
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
