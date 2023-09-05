import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getStats = async () => {
  try {
    const statsResult = await prisma.$queryRaw`
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

    if (statsResult) {
      return {
        message: 'Det gick bra, här är statistiken',
        data: statsResult
      };
    } else {
      return { message: 'Något gick fel i hämtandet av statistik' };
    }
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const stats = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'GET') {
    return new Promise((resolve) => {
      getStats()
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

export default stats;
