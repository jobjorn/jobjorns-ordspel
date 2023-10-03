import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

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

const invitations = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method === 'GET') {
    return new Promise((resolve) => {
      getUpdatedInvitations(req.query.email as string, req.query.sub as string)
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

export default invitations;
