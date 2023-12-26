import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import {
  checkAdjacentPlacement,
  checkCoherentWord,
  checkSameDirection,
  getPlayedWords,
  tilePoints,
  wordPoints
} from 'services/game';
import Ably from 'ably';
import { Tile } from 'types/types';
import { getUser } from 'services/authorization';
import { z } from 'zod';

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

const getGame = async (gameId: number) => {
  try {
    const getGamePrisma = await prisma.game.findUnique({
      where: {
        id: gameId
      },
      include: {
        users: {
          orderBy: {
            userSub: 'asc'
          },
          include: {
            user: true
          }
        },
        invitations: true,
        turns: {
          orderBy: {
            turnNumber: 'desc'
          },
          include: {
            moves: {
              orderBy: {
                userSub: 'asc'
              }
            }
          }
        }
      }
    });
    if (getGamePrisma === null) {
      return { message: 'Inget spel returnerades' };
    } else {
      return {
        message: 'Det gick bra, här är spelet med användare och allt',
        data: getGamePrisma
      };
    }
  } catch (error) {
    return { message: 'Det blev ett error: ' + error };
  }
};

const checkInSAOL = async (board: Tile[][]) => {
  let playedWords = getPlayedWords(board);

  let checkWordResult = await prisma.sAOL.findMany({
    where: {
      NOT: {
        form: 'böjning'
      },
      OR: playedWords.map((word) => ({
        word: {
          equals: word,
          mode: 'insensitive'
        }
      }))
    }
  });
  if (checkWordResult.length > 0) {
    let someWordMissing: boolean;

    someWordMissing = playedWords.some((word) => {
      let foundWord = checkWordResult.findIndex(
        (SAOL) => SAOL.word.toLowerCase() == word.toLowerCase()
      );
      if (foundWord == -1) {
        return true;
      } else {
        return false;
      }
    });

    return !someWordMissing;
  } else {
    return false;
  }
};

const submitMove = async (
  gameId: number,
  userSub: string,
  turnNumber: number,
  playedWord: string,
  playedBoard: Tile[][]
) => {
  // 1. Kolla att spelet finns
  const game = await getGame(gameId);
  if (game.data === undefined) {
    return {
      success: false,
      message: game.message
    };
  }

  // 2. Kolla att användaren är deltagare i spelet
  const userInGame = game.data?.users.find((user) => (user.userSub = userSub));
  if (userInGame === undefined) {
    return {
      success: false,
      message: 'Användaren som försöker lägga är inte deltagare i spelet.'
    };
  }

  // 3. Kolla att man inte gör dubbla drag
  const userAlreadyPlayed = game.data?.turns
    .find((turn) => turn.turnNumber == turnNumber)
    ?.moves.find((move) => move.userSub == userSub);
  if (userAlreadyPlayed) {
    return {
      success: false,
      message: 'Användaren som försöker lägga har redan lagt i den här turen.'
    };
  }

  // 4. kontrollera att lagda brickor är brickor som spelaren har
  const gameTiles = game.data.letters.split(',');
  let tilesInHand: Tile[] = [];
  for (let i = tilesInHand.length; i < 8; i++) {
    let popped = gameTiles.shift();
    if (popped) {
      tilesInHand.push({ letter: popped, placed: 'hand' });
    }
  }

  const playedTiles = playedBoard.flatMap((row) =>
    row.filter((cell) => cell.placed == 'submitted')
  );

  playedTiles.forEach((tile) => {
    let index = tilesInHand.findIndex(
      (handTile) => handTile.letter == tile.letter
    );
    if (index == -1) {
      return {
        success: false,
        message: 'Lagda brickor var inte samma som brickor i handen.'
      };
    }
  });

  // 5. Alla placerade brickor ska vara i samma riktning
  const sameDirection = checkSameDirection(playedBoard);
  if (sameDirection == false) {
    return {
      success: false,
      message:
        'Alla spelade brickor måste spelas i samma rad eller samma kolumn.'
    };
  }

  // 6. Placerade brickor får inte ha ett mellanrum
  const coherentWord = checkCoherentWord(playedBoard);
  if (coherentWord == false) {
    return {
      success: false,
      message: 'Det får inte finnas mellanrum bland de placerade brickorna.'
    };
  }

  // 7. Brickor får inte placeras som en egen ö
  const adjacentPlacement = checkAdjacentPlacement(playedBoard);
  if (adjacentPlacement == false && turnNumber > 1 && playedTiles.length > 0) {
    return {
      success: false,
      message:
        'Brickor måste placeras i anslutning till redan spelade brickor (såvida det inte är första draget).'
    };
  }

  // 8. Det lagda ordet måste vara samma som det som skickas med som spelat ord
  const wordIsSame = getPlayedWords(playedBoard).join(', ') === playedWord;
  if (wordIsSame == false) {
    return {
      success: false,
      message:
        'Det lagda ordet måste vara samma som det som skickades in som spelat ord.'
    };
  }

  // 9. De lagda orden måste finnas i ordlistan
  const inSAOL = await checkInSAOL(playedBoard);
  if (!inSAOL && getPlayedWords(playedBoard).length > 0) {
    return {
      success: false,
      message: 'Ett eller flera ord finns inte med i SAOL.'
    };
  }

  // 10. Kontrollera att med avseende på andra brickor än de lagda brickorna är brädet identiskt med det sparade brädet
  if (game.data.board !== null) {
    const savedBoard: Tile[][] = JSON.parse(game.data.board);

    let playedBoardLessSubmitted = playedBoard.map((row) =>
      row.map((cell) => {
        if (cell.placed !== 'submitted') {
          return cell;
        } else {
          return { letter: '', placed: 'no' };
        }
      })
    );
    if (
      JSON.stringify(savedBoard) !== JSON.stringify(playedBoardLessSubmitted)
    ) {
      return {
        success: false,
        message:
          'Det spelade brädet är inte identiskt med det sparade brädet (med undantag för lagda brickor).'
      };
    }
  }

  try {
    // Spara draget
    const createMove = await prisma.move.create({
      data: {
        turn: {
          connectOrCreate: {
            where: {
              gameId_turnNumber: {
                gameId: gameId,
                turnNumber: turnNumber
              }
            },
            create: {
              game: {
                connect: {
                  id: gameId
                }
              },
              turnNumber: turnNumber
            }
          }
        },
        user: {
          connect: {
            sub: userSub
          }
        },
        playedWord: playedWord,
        playedBoard: JSON.stringify(playedBoard),
        playedPoints: wordPoints(playedWord) + tilePoints(playedBoard)
      }
    });

    if (createMove === null) {
      throw new Error(
        'Något gick fel i sparandet av draget, createMove var null'
      );
    }

    let playersCount = game.data.users.length + game.data.invitations.length;
    let lastTurn = game.data.turns[0];
    lastTurn.moves.push(createMove); // lägg in draget vi just sparade
    let playedCount = lastTurn?.moves.length;
    let allSkipped = true;
    let gameEnded = false;

    let newTurn = playersCount == playedCount && playersCount > 0 && lastTurn;

    // For the full code sample see here: https://github.com/ably/quickstart-js
    const ablyApiKey = process.env.ABLY_API_KEY;
    if (ablyApiKey) {
      const ably = new Ably.Realtime.Promise(ablyApiKey);
      await ably.connection.once('connected');
      const channel = ably.channels.get('quickstart');
      await channel.publish('move', {
        gameId: gameId,
        newTurn: newTurn
      });
      ably.close();
    }

    if (!newTurn) {
      // turen är inte slut. dags att säga hejdå, efter att ha uppdaterat status

      await prisma.usersOnGames.update({
        where: {
          userSub_gameId: {
            gameId: gameId,
            userSub: userSub
          }
        },
        data: {
          status: 'OTHERTURN',
          statusTime: new Date()
        }
      });

      return {
        success: true,
        message: 'Nytt drag sparades. Turen fortsätter'
      };
    }

    // annars är det dags för ett nytt drag
    // definiera det vinnande draget eller konstatera att alla skippade
    let winningMove = lastTurn.moves[0];
    lastTurn.moves.map((move) => {
      if (
        move.playedPoints > winningMove.playedPoints ||
        (move.playedPoints == winningMove.playedPoints &&
          move.playedTime < winningMove.playedTime)
      ) {
        winningMove = move;
      }

      // om någon har lagt ett ord är det inte alla som har skippat
      if (move.playedWord !== '') {
        allSkipped = false;
      }
    });

    if (allSkipped) {
      gameEnded = true;
    }

    // markera det vinnande draget som vunnet
    await prisma.move.update({
      where: {
        id: winningMove.id
      },
      data: {
        won: true
      }
    });

    // uppdatera poäng för alla spelare
    // först en SQL-fråga för att räkna fram poäng per spelare
    const newPoints: { userSub: string; total_points: bigint }[] =
      await prisma.$queryRaw`
      SELECT
        "Move"."userSub",
        SUM("Move"."playedPoints") AS total_points
      FROM
        "Turn"
      JOIN
        "Move" ON "Turn".id = "Move"."turnId"
      WHERE
        "Turn"."gameId" = ${gameId}
      GROUP BY
        "Move"."userSub";
    `;

    // sedan en map som uppdaterar respektive spelares poäng
    if (newPoints.length > 0) {
      newPoints.map(async (newPoint) => {
        await prisma.usersOnGames.update({
          where: {
            userSub_gameId: {
              gameId: gameId,
              userSub: newPoint.userSub
            }
          },
          data: {
            points: Number(newPoint.total_points)
          }
        });
      });
    }

    // dags att rita om brädet
    // ta bort lagda brickor från "brickpåsen"
    let letters = game.data.letters.split(',');
    let playedLetters: string[] = [];
    let parsedWinningBoard: Tile[][] = JSON.parse(winningMove.playedBoard);
    parsedWinningBoard.map((row) =>
      row.map((cell) => {
        if (cell.placed === 'submitted') {
          playedLetters.push(cell.letter);
        }
      })
    );
    playedLetters.forEach((letter) => {
      let index = letters.indexOf(letter);
      if (index > -1) {
        letters.splice(index, 1);
      }
    });

    // om det inte finns några brickor kvar är spelet slut!
    if (letters.length == 0) {
      gameEnded = true;
    }

    let newLetters = letters.join(',');

    let winningBoard = winningMove.playedBoard
      .replaceAll('latest', 'board')
      .replaceAll('submitted', 'latest');

    // uppdatera game-statet med en ny tur
    await prisma.game.update({
      data: {
        letters: newLetters,
        board: winningBoard,
        latestWord: winningMove.playedBoard,
        currentTurn: {
          increment: 1
        },
        finished: gameEnded
      },
      where: {
        id: gameId
      }
    });

    if (gameEnded) {
      // om spelet tagit slut, markera alla spelare som FINISHED
      await prisma.usersOnGames.updateMany({
        where: {
          gameId: gameId
        },
        data: {
          status: 'FINISHED',
          statusTime: new Date()
        }
      });
    } else {
      // om spelet fortsätter så är det ny tur för alla
      await prisma.usersOnGames.updateMany({
        where: {
          gameId: gameId
        },
        data: {
          status: 'YOURTURN',
          statusTime: new Date()
        }
      });
    }

    return {
      success: true,
      message: 'Draget sparades'
    };
  } catch (error) {
    return {
      success: false,
      error: error
    };
  }
};

const acceptInvite = async (gameId: number, userSub: string) => {
  try {
    const updateResult = await prisma.usersOnGames.update({
      data: {
        userAccepted: true,
        status: 'YOURTURN',
        statusTime: new Date()
      },
      where: {
        userSub_gameId: {
          userSub,
          gameId
        }
      }
    });
    if (updateResult !== null) {
      return { success: true as const, response: 'Inbjudan accepterades' };
    } else {
      throw new Error(
        'Något gick fel i accepterandet av inbjudan, updateResult var null'
      );
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const declineInvite = async (gameId: number, userSub: string) => {
  try {
    const deleteResult = await prisma.usersOnGames.delete({
      where: {
        userSub_gameId: {
          userSub,
          gameId
        }
      }
    });
    if (deleteResult !== null) {
      checkDeclinations(gameId);

      return { success: true as const, response: 'Inbjudan avvisades' };
    } else {
      throw new Error(
        'Något gick fel i avvisandet av inbjudan, deleteResult var null'
      );
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const checkDeclinations = async (gameId: number) => {
  try {
    const checkDeclinationsResult = await prisma.usersOnGames.count({
      where: {
        gameId: gameId
      }
    });
    if (checkDeclinationsResult === 1) {
      const updateResult = await prisma.usersOnGames.updateMany({
        data: {
          status: 'REFUSED',
          statusTime: new Date()
        },
        where: {
          gameId: gameId
        }
      });
      if (updateResult !== null) {
        return {
          success: true as const,
          response: 'Alla inbjudningar har avvisats'
        };
      } else {
        throw new Error(
          'Något gick fel i uppdateringen av inbjudningsstatus, updateResult var null'
        );
      }
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const dismissRefusal = async (gameId: number, userSub: string) => {
  try {
    const deleteResult = await prisma.usersOnGames.delete({
      where: {
        userSub_gameId: {
          userSub,
          gameId
        }
      }
    });
    if (deleteResult !== null) {
      return { success: true as const, response: 'Spelet avvisades' };
    } else {
      throw new Error(
        'Något gick fel i avvisandet av spelet, deleteResult var null'
      );
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const dismissFinished = async (gameId: number, userSub: string) => {
  try {
    const updateResult = await prisma.usersOnGames.update({
      data: {
        finishedDismissed: true
      },
      where: {
        userSub_gameId: {
          userSub,
          gameId
        }
      }
    });
    if (updateResult !== null) {
      return { success: true as const, response: 'Spelet arkiverades' };
    } else {
      throw new Error(
        'Något gick fel i arkiveringen av det avslutade spelet, deleteResult var null'
      );
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

interface PostRequestBodyMove {
  variant: 'move';
  turnNumber: number;
  playedWord: string;
  playedBoard: Tile[][];
}

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

  if (req.method === 'POST' && req.body.variant == 'move') {
    try {
      const { turnNumber, playedWord, playedBoard }: PostRequestBodyMove =
        req.body;

      const moveSchema = z.object({
        turnNumber: z.number(),
        playedWord: z.string(),
        playedBoard: z.array(
          z.array(
            z.object({
              letter: z.string().max(1),
              placed: z.enum(['no', 'hand', 'board', 'submitted', 'latest'])
            })
          )
        )
      });

      const parsedMove = moveSchema.safeParse({
        turnNumber: turnNumber,
        playedWord: playedWord,
        playedBoard: playedBoard
      });

      if (!parsedMove.success) {
        console.log(parsedMove.error);
        throw new Error(
          'Något gick fel i hanteringen av draget, parsedMove lyckades inte'
        );
      } else {
        const result = await submitMove(
          parseInt(req.query.id as string, 10),
          loggedInUser.sub,
          parsedMove.data.turnNumber,
          parsedMove.data.playedWord,
          parsedMove.data.playedBoard
        );
        res.status(200).json(result);
      }
    } catch (error) {
      console.error(error);
      res.status(500).end('Något gick fel.');
    }
  } else if (req.method === 'GET') {
    try {
      const result = await getGame(parseInt(req.query.id as string, 10));
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).end('Något gick fel.');
    }
  } else if (req.method === 'POST' && req.body.variant != 'move') {
    try {
      const notMoveSchema = z.object({
        variant: z.enum([
          'accept',
          'decline',
          'dismissRefusal',
          'dismissFinished'
        ]),
        gameId: z.number(),
        userSub: z.string()
      });

      const parsedInput = notMoveSchema.safeParse({
        variant: req.body.variant,
        gameId: parseInt(req.query.id as string, 10),
        userSub: req.body.userSub
      });

      if (!parsedInput.success) {
        console.log(parsedInput.error);
        throw new Error('Något gick fel, safeParse lyckades inte');
      }
      let result;
      if (req.body.variant == 'accept') {
        result = await acceptInvite(
          parsedInput.data.gameId,
          parsedInput.data.userSub
        );
      } else if (req.body.variant == 'decline') {
        result = await declineInvite(
          parsedInput.data.gameId,
          parsedInput.data.userSub
        );
      } else if (req.body.variant == 'dismissRefusal') {
        result = await dismissRefusal(
          parsedInput.data.gameId,
          parsedInput.data.userSub
        );
      } else if (req.body.variant == 'dismissFinished') {
        result = await dismissFinished(
          parsedInput.data.gameId,
          parsedInput.data.userSub
        );
      } else {
        throw new Error(
          'Något gick fel, varianten var inte move, accept, decline, dismissRefusal eller dismissFinished'
        );
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

export default games;
