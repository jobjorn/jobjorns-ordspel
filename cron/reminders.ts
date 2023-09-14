import { Prisma, PrismaClient } from '@prisma/client';
import * as sendgrid from '@sendgrid/mail';
import * as crypto from 'crypto';

type UserWithGamesAndMoves = Prisma.UserGetPayload<{
  include: {
    games: {
      include: {
        game: {
          include: {
            users: {
              orderBy: {
                user: {
                  name: 'asc';
                };
              };
              include: {
                user: true;
              };
            };
          };
        };
      };
    };
    moves: true;
  };
}>;

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendReminderEmail = async (user: UserWithGamesAndMoves) => {
  console.log('sending reminder to', user.name);

  let gamesListText = '';
  let gamesListHtml = '';
  let hasInvites = 0;
  let hasYourTurn = 0;
  user.games.forEach((game) => {
    let playersList = '';
    game.game.users.forEach((player) => {
      if (player.userSub !== user.sub) {
        if (playersList.length == 0) {
          playersList = player.user.name;
        } else {
          playersList += ', ' + player.user.name;
        }
      }
    });

    if (game.status === 'INVITED') {
      hasInvites++;
      gamesListText += `📫 Inbjudan till att spela med ${playersList}\n`;
      gamesListHtml += `📫 Inbjudan till att spela med <a href="https://www.ordbjorn.se/">${playersList}</a><br>`;
    } else if (game.status === 'YOURTURN') {
      hasYourTurn++;
      gamesListText += `🟢 Din tur i spel med ${playersList}\n`;
      gamesListHtml += `🟢 Din tur i spel med <a href="https://www.ordbjorn.se/game/${game.gameId}">${playersList}</a><br>`;
    } else if (game.status === 'OTHERTURN') {
      gamesListText += `🔴 Väntar i spel med ${playersList}\n`;
      gamesListHtml += `🔴 Väntar i spel med <a href="https://www.ordbjorn.se/game/${game.gameId}">${playersList}</a><br>`;
    }
  });

  let titleText = '';
  let openingText = '';
  if (hasInvites > 1 && hasYourTurn > 1) {
    titleText = 'Dina medspelare väntar i Ordbjörn';
    openingText =
      'Det är din tur i flera spel, och du har väntande inbjudningar!';
  } else if (hasInvites == 1 && hasYourTurn > 1) {
    titleText = 'Dina medspelare väntar i Ordbjörn';
    openingText =
      'Det är din tur i flera spel, och du har en väntande inbjudan!';
  } else if (hasInvites > 1 && hasYourTurn == 1) {
    titleText = 'Dina medspelare väntar i Ordbjörn';
    openingText =
      'Det är din tur i ett spel, och du har väntande inbjudningar!';
  } else if (hasInvites == 1 && hasYourTurn == 1) {
    titleText = 'Dina medspelare väntar i Ordbjörn';
    openingText = 'Det är din tur i ett spel, och du har en väntande inbjudan!';
  } else if (hasInvites > 1 && hasYourTurn == 0) {
    titleText = 'Du har väntande inbjudningar i Ordbjörn';
    openingText = 'Du har väntande inbjudningar i Ordbjörn!';
  } else if (hasInvites == 1 && hasYourTurn == 0) {
    titleText = 'Du har en väntande inbjudan i Ordbjörn';
    openingText = 'Du har en väntande inbjudan i Ordbjörn!';
  } else if (hasInvites == 0 && hasYourTurn > 1) {
    titleText = 'Det är din tur i flera spel i Ordbjörn';
    openingText = 'Det är din tur i flera spel i Ordbjörn!';
  } else if (hasInvites == 0 && hasYourTurn == 1) {
    titleText = 'Det är din tur i Ordbjörn';
    openingText = 'Det är din tur i ett spel i Ordbjörn!';
  }

  let stopRemindersHash;
  if (user.stopRemindersHash) {
    stopRemindersHash = user.stopRemindersHash;
  } else {
    stopRemindersHash = crypto.randomUUID();
    try {
      await prisma.user.update({
        where: {
          sub: user.sub
        },
        data: {
          stopRemindersHash: stopRemindersHash
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  let toggleText =
    'Om du inte vill ta emot påminnelser från Ordbjörn, så kan du stänga av dem: https://www.ordbjorn.se/stopreminders/?key=' +
    stopRemindersHash;
  let toggleHtml =
    'Om du inte vill ta emot påminnelser från Ordbjörn, så kan du <a href="https://www.ordbjorn.se/stopreminders/?key=' +
    stopRemindersHash +
    '">stänga av dem</a>.';

  if (titleText && openingText) {
    // send email
    const message = {
      to: user.email,
      from: 'Ordbjörn <jobjorn@jobjorn.se>',
      subject: titleText,
      text:
        'Hej!\n\n' +
        openingText +
        '\n\n' +
        gamesListText +
        '\n' +
        toggleText +
        '\n\n' +
        'Allt gott,\nJobj&ouml;rn',
      html:
        'Hej!<br><br>' +
        openingText +
        '<br><br>' +
        gamesListHtml +
        '<br>' +
        toggleHtml +
        '<br><br>' +
        'Allt gott,<br>Jobj&ouml;rn'
    };
    try {
      await sendgrid.send(message);

      await prisma.user.update({
        where: {
          sub: user.sub
        },
        data: {
          lastReminded: new Date()
        }
      });
    } catch (error) {
      console.error(error);
    }
  }
};

const generateReminders = async () => {
  const userList: UserWithGamesAndMoves[] = await prisma.user.findMany({
    include: {
      games: {
        include: {
          game: {
            include: {
              users: {
                orderBy: {
                  user: {
                    name: 'asc'
                  }
                },
                include: {
                  user: true
                }
              }
            }
          }
        },
        orderBy: {
          statusTime: 'desc'
        }
      },
      moves: true
    }
  });
  if (userList) {
    userList.forEach((user) => {
      let latestMove = user.moves.reduce((prev, current) => {
        return prev.playedTime > current.playedTime ? prev : current;
      });

      // filter games where status is YOURTURN or INVITED
      let gamesList = user.games.filter((game) => {
        return game.status === 'YOURTURN' || game.status === 'INVITED';
      });

      console.log(user.name, latestMove.playedTime);
      let lastReminded = user.lastReminded || '2023-04-01T00:00:00.000Z';
      let latestMovePlayedTime =
        latestMove.playedTime || '2023-04-01T00:00:00.000Z';

      const now = new Date();
      const latestMoveDate = new Date(latestMovePlayedTime);
      const lastRemindedDate = new Date(lastReminded);
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));

      if (
        latestMoveDate < sevenDaysAgo &&
        lastRemindedDate < sevenDaysAgo &&
        gamesList.length > 0
      ) {
        sendReminderEmail(user);
      }
    });
  } else {
    console.log('no users found');
  }
};

generateReminders();
