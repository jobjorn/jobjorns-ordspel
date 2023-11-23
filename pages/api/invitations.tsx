import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUser } from 'services/authorization';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const getUpdatedInvitations = async (email: string, sub: string) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: {
        email: email
      }
    });

    if (invitations.length > 0) {
      const updateResult = await Promise.all(
        invitations.map(async (invitation) => {
          await prisma.game.update({
            where: {
              id: invitation.gameId
            },
            data: {
              invitations: {
                delete: {
                  id: invitation.id
                }
              },
              users: {
                create: {
                  userSub: sub,
                  userAccepted: true
                }
              }
            }
          });
        })
      );
      if (updateResult !== null) {
        return {
          message: `Inbjudningar hittades`,
          data: updateResult
        };
      } else {
        throw new Error(
          'Något gick fel i omvandlingen av inbjudningar, updateResult var null'
        );
      }
    } else {
      return {
        message: `Inga inbjudningar hittades för ${email}`,
        data: []
      };
    }
  } catch (error) {
    throw new Error('Det blev ett error: ' + error);
  }
};

const invitations = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // endast tillåtet om man är inloggad
    const loggedInUser = await getUser(req, res);
    if (loggedInUser === null) {
      res.status(401).end();
      await prisma.$disconnect();
      return;
    }

    try {
      const result = await getUpdatedInvitations(
        req.query.email as string,
        req.query.sub as string
      );
      res.status(200).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).end('Något gick fel.');
    }
  } else {
    res.status(404).end();
  }

  await prisma.$disconnect();
  return;
};

export default invitations;
