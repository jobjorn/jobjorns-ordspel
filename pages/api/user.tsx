import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, User } from '@prisma/client';
import { getUser } from 'services/authorization';
import { z } from 'zod';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const updateUser = async (
  user: Pick<User, 'sub' | 'settingVisibility' | 'receiveReminders'>
) => {
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
    // endast tillåtet om man är inloggad
    const loggedInUser = await getUser(req, res);
    if (
      loggedInUser === null ||
      loggedInUser?.sub === undefined ||
      loggedInUser?.sub === null
    ) {
      res.status(401).end();
      await prisma.$disconnect();
      return;
    }

    try {
      const userSettingsSchema = z.object({
        settingVisibility: z.boolean(),
        receiveReminders: z.boolean()
      });

      const parsedUserSettings = userSettingsSchema.safeParse(req.body);

      if (!parsedUserSettings.success) {
        console.log(req.body);
        console.log(parsedUserSettings.error);
        throw new Error('Invalid key.');
      }

      const result = await updateUser({
        sub: loggedInUser.sub,
        settingVisibility: parsedUserSettings.data.settingVisibility,
        receiveReminders: parsedUserSettings.data.receiveReminders
      });
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

export default users;
