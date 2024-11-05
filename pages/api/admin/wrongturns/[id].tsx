import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser } from 'services/authorization';
import { z } from 'zod';
import { WrongTurnsData } from 'types/types';
import { generateNewTurn, getGame } from 'pages/api/games/[id]';

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
          },
          invitations: true
        },
        where: {
          id: gameId
        }
      }
    );

    let messages: string[] = [];
    let yourTurn = false;
    let startNewTurn = false;
    messages = await Promise.all(
      wrongTurnResult.users.map(async (user) => {
        // Om spelet är avslutat och användaren inte är avslutad
        if (wrongTurnResult.finished && user.status !== 'FINISHED') {
          await prisma.usersOnGames.update({
            where: {
              userSub_gameId: {
                userSub: user.userSub,
                gameId: gameId
              }
            },
            data: {
              status: 'FINISHED'
            }
          });
          return 'Ändrade status för ' + user.user.name + ' till FINISHED';
        }
        // Om det inte är användarens tur och användaren inte har gjort något drag
        else if (
          user.status === 'OTHERTURN' &&
          wrongTurnResult.turns[0].moves.filter(
            (move) => move.userSub === user.user.sub
          ).length === 0
        ) {
          await prisma.usersOnGames.update({
            where: {
              userSub_gameId: {
                userSub: user.userSub,
                gameId: gameId
              }
            },
            data: {
              status: 'YOURTURN'
            }
          });
          return 'Ändrade status för ' + user.user.name + ' till YOURTURN';
        }
        // Om det är användarens tur och användaren har gjort ett drag,
        // såvida inte alla gjort ett drag
        else if (
          user.status === 'YOURTURN' &&
          wrongTurnResult.turns[0].moves.filter(
            (move) => move.userSub === user.user.sub
          ).length > 0 &&
          wrongTurnResult.users.length + wrongTurnResult.invitations.length !==
            wrongTurnResult.turns[0].moves.length
        ) {
          yourTurn = true;
          await prisma.usersOnGames.update({
            where: {
              userSub_gameId: {
                userSub: user.userSub,
                gameId: gameId
              }
            },
            data: {
              status: 'OTHERTURN'
            }
          });
          return 'Ändrade status för ' + user.user.name + ' till OTHERTURN';
        }
        // Om alla har gjort ett drag
        else if (
          user.status === 'YOURTURN' &&
          wrongTurnResult.turns[0].moves.filter(
            (move) => move.userSub === user.user.sub
          ).length > 0 &&
          wrongTurnResult.users.length + wrongTurnResult.invitations.length ===
            wrongTurnResult.turns[0].moves.length
        ) {
          startNewTurn = true;
          return 'Behöver starta ny tur i spel ' + gameId;
        } else {
          return 'Ingen ändring förefaller behövas för ' + user.user.name;
        }
      })
    );

    let messages2: string[] = [];

    // Om det inte är någons tur och spelet inte är avslutat
    if (
      !yourTurn &&
      !wrongTurnResult.finished &&
      wrongTurnResult.invitations.length === 0
    ) {
      await prisma.usersOnGames.updateMany({
        where: {
          gameId: gameId,
          status: 'OTHERTURN'
        },
        data: {
          status: 'YOURTURN'
        }
      });
      messages2.push('Ändrade status för alla till YOURTURN');
    }

    // Om alla har gjort ett drag och det behöver startas en ny tur
    if (startNewTurn) {
      const game = await getGame(gameId);
      if (game.data === undefined) {
        return 'Kunde inte hämta spelet';
      }
      await generateNewTurn(game.data);

      messages2.push('Startade ny tur i spel ' + gameId);
    }

    let message = [...messages, ...messages2].join(', ');

    console.log(message);
    return { message: message };
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

      try {
        let result = await fixGame(parsedInput.data.gameId);

        res.status(200).json(result);
      } catch (error) {
        console.error(error);
      }
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
