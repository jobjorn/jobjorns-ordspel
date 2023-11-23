import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

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
    return 'Något gick fel, försök igen eller kontakta utvecklaren.';
  }
};

const turnOffReminders = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    try {
      const key: string = req.body.key;

      const result = await updateRemindersSetting(key);
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

export default turnOffReminders;
