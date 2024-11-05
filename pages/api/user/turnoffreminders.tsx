import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

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
    if (error instanceof Error) {
      return (
        'Något gick fel, försök igen eller kontakta utvecklaren. Felmeddelande: ' +
        error.message
      );
    }
    return 'Något gick fel, försök igen eller kontakta utvecklaren.';
  }
};

const turnOffReminders = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    try {
      const keySchema = z.string().uuid();

      const parsedKey = keySchema.safeParse(req.body.key);

      if (!parsedKey.success) {
        console.log(parsedKey.error);
        throw new Error('Invalid key.');
      }

      const result = await updateRemindersSetting(parsedKey.data);
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
