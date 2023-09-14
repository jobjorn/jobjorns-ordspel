import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updateRemindersSetting = async (key: string) => {
  try {
    if (!key) {
      throw new Error('No key provided.');
    }
    const updatedUser = await prisma.user.update({
      where: { stopRemindersHash: key },
      data: {
        receiveReminders: false
      }
    });

    return updatedUser;
  } catch (error) {
    console.log(error);

    return 'Något gick fel, försök igen eller kontakta utvecklaren.';
  }
};

const turnOffReminders = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'PATCH') {
    return new Promise(async (resolve) => {
      const key: string = req.body.key;

      updateRemindersSetting(key)
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

export default turnOffReminders;
