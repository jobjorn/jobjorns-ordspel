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

const users = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'PATCH') {
    return new Promise(async (resolve) => {
      const loggedInUser = await getUser(req, res);
      const user: User = req.body.user;
      if (loggedInUser?.sub !== user.sub) {
        res.status(401).end('Unauthorized.');
        resolve();
        return;
      }

      updateUser(user)
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
