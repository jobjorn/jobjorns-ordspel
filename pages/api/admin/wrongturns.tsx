import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser } from 'services/authorization';
import { WrongTurnsData } from 'types/types';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const getWrongTurnsData = async () => {
  try {
    const wrongTurnsResult: WrongTurnsData[] = await prisma.game.findMany({
      include: {
        users: {
          include: {
            user: true
          }
        },
        turns: {
          include: {
            moves: {
              select: {
                userSub: true
              }
            }
          },
          orderBy: {
            id: 'desc'
          },
          take: 1
        },
        invitations: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    if (wrongTurnsResult.length === 0) {
      throw new Error('Ingen data hittades');
    }
    return {
      message: 'Det gick bra, här är datat',
      data: wrongTurnsResult
    };
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const wrongturns = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
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
      const result = await getWrongTurnsData();
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

export default wrongturns;
