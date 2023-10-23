import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser } from 'services/authorization';
import { StatsData } from 'types/types';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const getStats = async () => {
  try {
    const statsResult: StatsData = await prisma.$queryRaw`
      WITH date_range AS (
        SELECT generate_series(
            (SELECT MIN(DATE_TRUNC('day', "playedTime")) FROM "Move"),
            (SELECT MAX(DATE_TRUNC('day', "playedTime")) FROM "Move"),
            interval '1 day'
        ) AS day
      )
      
      SELECT
          dr.day AS day,
          COALESCE(COUNT(DISTINCT u."sub")::integer, 0) AS unique_users_with_turns,
          COALESCE(COUNT("m"."userSub")::integer, 0) AS total_moves
      FROM
          date_range dr
      LEFT JOIN
          "Move" m ON dr.day = DATE_TRUNC('day', "m"."playedTime")
      LEFT JOIN
          "users" u ON u."sub" = "m"."userSub"
      GROUP BY
          dr.day
      ORDER BY
          dr.day;
    `;

    if (statsResult.length === 0) {
      throw new Error('Ingen statistik hittades');
    }
    return {
      message: 'Det gick bra, här är statistiken',
      data: statsResult
    };
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const stats = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // endast tillåtet om man är inloggad
    const loggedInUser = await getUser(req, res);
    if (loggedInUser === null) {
      res.status(401).end();
      await prisma.$disconnect();
      return;
    }

    try {
      const result = await getStats();
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

export default stats;
