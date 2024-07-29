import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser } from 'services/authorization';
import { z } from 'zod';
import { WrongTurnsData } from 'types/types';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const fixGame = async (gameId: number) => {
  try {
    const wrongTurnResult: WrongTurnsData = await prisma.game.findUniqueOrThrow(
      {
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
          }
        },
        where: {
          id: gameId
        }
      }
    );

    wrongTurnResult.users.forEach((user) => {
      if (wrongTurnResult.finished && user.status !== 'FINISHED') {
        console.log('Ändrar status för ' + user.user.name + ' till FINISHED');
      } else if (
        user.status === 'OTHERTURN' &&
        wrongTurnResult.turns[0].moves.filter(
          (move) => move.userSub === user.user.sub
        ).length === 0
      ) {
        console.log('Ändrar status för ' + user.user.name + ' till YOURTURN');
      } else if (
        user.status === 'YOURTURN' &&
        wrongTurnResult.turns[0].moves.filter(
          (move) => move.userSub === user.user.sub
        ).length > 0
      ) {
        console.log('Ändrar status för ' + user.user.name + ' till OTHERTURN');
      } else {
        console.log('Ingen ändring förefaller behövas');
      }
    });
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const fixWrongTurn = async (req: NextApiRequest, res: NextApiResponse) => {
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

  // endast tillåtet om man är admin
  /*
  if (loggedInUser?.role !== 'admin') {
    res.status(403).end();
    await prisma.$disconnect();
    return;
  }
    */

  if (req.method === 'PATCH') {
    try {
      const patchSchema = z.object({
        gameId: z.number()
      });

      const parsedInput = patchSchema.safeParse({
        gameId: parseInt(req.query.id as string, 10)
      });

      if (!parsedInput.success) {
        console.log(parsedInput.error);
        throw new Error('Något gick fel, safeParse lyckades inte');
      }

      let result;
      try {
        result = await fixGame(parsedInput.data.gameId);
      } catch (error) {
        console.error(error);
      }

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

export default fixWrongTurn;
