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
  let invitesText = '';
  let yourTurnText = '';
  let otherTurnText = '';
  let invitesHtml = '';
  let yourTurnHtml = '';
  let otherTurnHtml = '';

  let hasInvites = 0;
  let hasYourTurn = 0;
  let hasOtherTurn = 0;

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
      invitesText += `📫 Inbjudan till att spela med ${playersList}\n`;
      invitesHtml += `📫 Inbjudan till att spela med <a href="https://www.ordbjorn.se/">${playersList}</a><br>`;
    } else if (game.status === 'YOURTURN') {
      hasYourTurn++;
      yourTurnText += `🟢 Din tur i spel med ${playersList}\n`;
      yourTurnHtml += `🟢 Din tur i spel med <a href="https://www.ordbjorn.se/game/${game.gameId}">${playersList}</a><br>`;
    } else if (game.status === 'OTHERTURN') {
      hasOtherTurn++;
      otherTurnText += `🔴 Väntar i spel med ${playersList}\n`;
      otherTurnHtml += `🔴 Väntar i spel med <a href="https://www.ordbjorn.se/game/${game.gameId}">${playersList}</a><br>`;
    }
  });

  if (hasInvites > 0) {
    invitesText = 'Väntande inbjudningar:\n\n' + invitesText + '\n';
    invitesHtml =
      '<strong>Väntande inbjudningar:</strong><br><br>' + invitesHtml + '<br>';
  }
  if (hasYourTurn > 0) {
    yourTurnText = 'Din tur:\n\n' + yourTurnText + '\n';
    yourTurnHtml = '<strong>Din tur:</strong><br><br>' + yourTurnHtml + '<br>';
  }
  if (hasOtherTurn > 0) {
    otherTurnText = 'Väntar på andra spelare:\n\n' + otherTurnText + '\n';
    otherTurnHtml =
      '<strong>Väntar på andra spelare:</strong><br><br>' +
      otherTurnHtml +
      '<br>';
  }

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
        invitesText +
        yourTurnText +
        otherTurnText +
        toggleText +
        '\n\n' +
        'Allt gott,\nJobj&ouml;rn',
      html:
        'Hej!<br><br>' +
        openingText +
        '<br><br>' +
        invitesHtml +
        yourTurnHtml +
        otherTurnHtml +
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
      let latestMove = user.moves.reduce(
        (prev, current) => {
          return prev.playedTime > current.playedTime ? prev : current;
        },
        { playedTime: new Date('2023-04-01T00:00:00.000Z') }
      );

      // filter games where status is YOURTURN or INVITED
      let gamesList = user.games.filter((game) => {
        return game.status === 'YOURTURN' || game.status === 'INVITED';
      });

      let lastReminded =
        user.lastReminded || new Date('2023-04-01T00:00:00.000Z');
      let latestMovePlayedTime =
        latestMove.playedTime || new Date('2023-04-01T00:00:00.000Z');

      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));

      if (
        latestMovePlayedTime < sevenDaysAgo &&
        lastReminded < sevenDaysAgo &&
        gamesList.length > 0
      ) {
        console.log('sending reminder to', user.name);
        sendReminderEmail(user);
      } else {
        console.log('NOT sending reminder to', user.name);
      }
    });
  } else {
    console.log('no users found');
  }
};

generateReminders();
