import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser } from 'services/authorization';

const prisma = new PrismaClient({
  log: ['warn', 'error', 'query', 'info']
});

const forceUpdateAllPoints = async () => {
  let gamesList = await prisma.game.findMany();

  console.log('gamesList', gamesList.length);

  gamesList.map(async (game) => {
    console.log('NEW GAME', game.id);
    let newPoints: { userSub: string; total_points: bigint }[] =
      await prisma.$queryRaw`
      SELECT
        "Move"."userSub",
        SUM("Move"."playedPoints") AS total_points
      FROM
        "Turn"
      JOIN
        "Move" ON "Turn".id = "Move"."turnId"
      WHERE
        "Turn"."gameId" = ${game.id}
      GROUP BY
        "Move"."userSub";
    `;
    console.log('newPoints', game.id, newPoints);

    // sedan en map som uppdaterar respektive spelares poäng
    if (newPoints.length > 0) {
      newPoints.map(async (newPoint) => {
        console.log('running update', newPoint);
        await prisma.usersOnGames.update({
          where: {
            userSub_gameId: {
              gameId: game.id,
              userSub: newPoint.userSub
            }
          },
          data: {
            points: Number(newPoint.total_points)
          }
        });
      });
    }
  });
};

const games = async (req: NextApiRequest, res: NextApiResponse) => {
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

  if (req.method === 'GET') {
    try {
      const result = await forceUpdateAllPoints();
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

export default games;
