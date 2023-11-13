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

const updatePoints = async (gameId: number) => {
  // TODO: update points for all players
  // sum of playedPoints in move per player with the gameId

  try {
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

    console.log(newPoints);
    if (newPoints.length > 0) {
      newPoints.map(async (newPoint) => {
        let updatePoint = await prisma.usersOnGames.update({
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
        console.log(updatePoint);
      });
    }

    if (newPoints === null) {
      return { success: false as const, response: 'Inga poäng uppdaterades' };
    } else {
      return {
        success: true as const,
        response: newPoints
      };
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const submitMove = async (
  gameId: number,
  userSub: string,
  turnNumber: number,
  playedWord: string,
  playedBoard: string
) => {
  /*
1. hämta spelet så att vi kan jobba med det
2. kontrollera att spelaren får lägga
3. kontrollera att spelaren följer alla ordinarie spelregler
4. kontrollera att draget är konsekvent med tillgängliga brickor och det sparade brädet

5. spara draget!

6. kontrollera om det är sista draget i turen
om ja:
7. skapa en ny tur
8. uppdatera vinnande drag
9. uppdatera poäng

10. kontrollera om spelet är slut
om ja:
11. uppdatera spelets status

12. uppdatera status för alla spelare


  */

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

  const parsedBoard: Tile[][] = JSON.parse(playedBoard);
  const playedTiles = parsedBoard.flatMap((row) =>
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
  const sameDirection = checkSameDirection(parsedBoard);
  if (sameDirection == false) {
    return {
      success: false,
      message:
        'Alla spelade brickor måste spelas i samma rad eller samma kolumn.'
    };
  }

  // 6. Placerade brickor får inte ha ett mellanrum
  const coherentWord = checkCoherentWord(parsedBoard);
  if (coherentWord == false) {
    return {
      success: false,
      message: 'Det får inte finnas mellanrum bland de placerade brickorna.'
    };
  }

  // 7. Brickor får inte placeras som en egen ö
  const adjacentPlacement = checkAdjacentPlacement(parsedBoard);
  if (adjacentPlacement == false && turnNumber > 1 && playedTiles.length > 0) {
    return {
      success: false,
      message:
        'Brickor måste placeras i anslutning till redan spelade brickor (såvida det inte är första draget).'
    };
  }

  // 8. Det lagda ordet måste vara samma som det som skickas med som spelat ord
  const wordIsSame = getPlayedWords(parsedBoard).join(', ') === playedWord;
  if (wordIsSame == false) {
    return {
      success: false,
      message:
        'Det lagda ordet måste vara samma som det som skickades in som spelat ord.'
    };
  }

  // 9. De lagda orden måste finnas i ordlistan
  const inSAOL = await checkInSAOL(parsedBoard);
  if (!inSAOL && getPlayedWords(parsedBoard).length > 0) {
    return {
      success: false,
      message: 'Ett eller flera ord finns inte med i SAOL.'
    };
  }

  // 10. Kontrollera att med avseende på andra brickor än de lagda brickorna är brädet identiskt med det sparade brädet
  if (game.data.board !== null) {
    const savedBoard: Tile[][] = JSON.parse(game.data.board);

    let playedBoardLessSubmitted = parsedBoard.map((row) =>
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
        playedBoard: playedBoard,
        playedPoints: wordPoints(playedWord) + tilePoints(parsedBoard)
      }
    });

    if (createMove === null) {
      throw new Error(
        'Något gick fel i sparandet av draget, createMove var null'
      );
    }

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

    let turnEndResult = await runTurnEnd(gameId);

    // For the full code sample see here: https://github.com/ably/quickstart-js
    const ablyApiKey = process.env.ABLY_API_KEY;
    if (ablyApiKey) {
      const ably = new Ably.Realtime.Promise(ablyApiKey);
      await ably.connection.once('connected');
      const channel = ably.channels.get('quickstart');
      await channel.publish('move', {
        gameId: gameId,
        newTurn: turnEndResult.success
      });
      ably.close();
    }

    return {
      success: true,
      move: { response: 'Draget sparades' },
      turn: { response: turnEndResult.turn.response },
      updateMove: { response: turnEndResult.updateMove.response }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Det blev ett error: ' + error
    };
  }
};

export const runTurnEnd = async (gameId: number) => {
  const game = await getGame(gameId);

  if (game.data) {
    let playersCount = game.data.users.length + game.data.invitations.length;
    let lastTurn = game.data.turns[0];
    let playedCount = lastTurn?.moves.length;
    let allSkipped = true;
    let gameEnded = false;

    if (playersCount == playedCount && playersCount > 0 && lastTurn) {
      let winningMove = lastTurn.moves[0];
      lastTurn.moves.map((move) => {
        if (
          move.playedPoints > winningMove.playedPoints ||
          (move.playedPoints == winningMove.playedPoints &&
            move.playedTime < winningMove.playedTime)
        ) {
          winningMove = move;
        }

        if (move.playedWord !== '') {
          allSkipped = false;
        }
      });

      if (allSkipped) {
        gameEnded = true;
      }

      let updateMove = await updateWinningMove(winningMove.id);
      if (updateMove.success == false) {
        throw new Error(updateMove.response);
      }

      let updatedPoints = await updatePoints(gameId);
      if (updatedPoints.success == false) {
        throw new Error(updatedPoints.response);
      }

      let letters = game.data.letters.split(',');
      let playedLetters: string[] = [];
      let playedBoard: Tile[][] = JSON.parse(winningMove.playedBoard);
      playedBoard.map((row) =>
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

      if (letters.length == 0 && !gameEnded) {
        gameEnded = true;
      }

      let newLetters = letters.join(',');

      let winningBoard = winningMove.playedBoard
        .replaceAll('latest', 'board')
        .replaceAll('submitted', 'latest');

      try {
        const turnResult = await submitTurn(
          gameId,
          newLetters,
          winningBoard,
          winningMove.playedWord
        );
        if (turnResult.success && updateMove.success) {
          if (gameEnded) {
            await endGame(gameId);
          }

          return {
            success: true as const,
            turn: { response: turnResult.response },
            updateMove: { response: updateMove.response }
          };
        } else {
          throw new Error(turnResult.response);
        }
      } catch (error) {
        return {
          success: false as const,
          turn: { response: error },
          updateMove: { response: updateMove.response }
        };
      }
    } else {
      return {
        success: false as const,
        turn: { response: 'Inte sista turen' },
        updateMove: { response: 'Inte sista turen' }
      };
    }
  } else {
    return {
      success: false as const,
      turn: { response: 'Game hittades inte' },
      updateMove: { response: 'Game hittades inte' }
    };
  }
};

const updateWinningMove = async (moveId: number) => {
  try {
    const updateMove = await prisma.move.update({
      where: {
        id: moveId
      },
      data: {
        won: true
      }
    });

    if (updateMove === null) {
      return { success: false as const, response: 'Inget drag returnerades' };
    } else {
      return {
        success: true as const,
        response: updateMove
      };
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const submitTurn = async (
  gameId: number,
  letters: string,
  board: string,
  latestWord: string
) => {
  try {
    const updateResult = await prisma.game.update({
      data: {
        letters,
        board,
        latestWord,
        currentTurn: {
          increment: 1
        }
      },
      where: {
        id: gameId
      }
    });
    if (updateResult !== null) {
      await prisma.usersOnGames.updateMany({
        where: {
          gameId: gameId
        },
        data: {
          status: 'YOURTURN',
          statusTime: new Date()
        }
      });

      return { success: true as const, response: 'Ny tur sparades' };
    } else {
      throw new Error(
        'Något gick fel i sparandet av ny tur, updateResult var null'
      );
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
    };
  }
};

const endGame = async (gameId: number) => {
  try {
    const endGameResult = await prisma.game.update({
      data: {
        finished: true
      },
      where: {
        id: gameId
      }
    });
    if (endGameResult !== null) {
      await prisma.usersOnGames.updateMany({
        where: {
          gameId: gameId
        },
        data: {
          status: 'FINISHED',
          statusTime: new Date()
        }
      });

      return { success: true as const, response: 'Spelet avslutades' };
    } else {
      throw new Error(
        'Något gick fel i avslutandet av spelet, endGameResult var null'
      );
    }
  } catch (error) {
    return {
      success: false as const,
      response: 'Det blev ett error: ' + error
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
  playedBoard: string;
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
      const result = await submitMove(
        parseInt(req.query.id as string, 10),
        loggedInUser.sub,
        turnNumber,
        playedWord,
        playedBoard
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else if (req.method === 'GET') {
    try {
      const result = await getGame(parseInt(req.query.id as string, 10));
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else if (req.method === 'POST' && req.body.variant == 'accept') {
    try {
      const result = await acceptInvite(
        parseInt(req.query.id as string, 10),
        req.body.userSub
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else if (req.method === 'POST' && req.body.variant == 'decline') {
    try {
      const result = await declineInvite(
        parseInt(req.query.id as string, 10),
        req.body.userSub
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else if (req.method === 'POST' && req.body.variant == 'dismissRefusal') {
    try {
      const result = await dismissRefusal(
        parseInt(req.query.id as string, 10),
        req.body.userSub
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).end(error);
    }
  } else if (req.method === 'POST' && req.body.variant == 'dismissFinished') {
    try {
      const result = await dismissFinished(
        parseInt(req.query.id as string, 10),
        req.body.userSub
      );
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

export default games;
