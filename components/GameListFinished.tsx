import React from 'react';
import {
  Avatar,
  AvatarGroup,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import Link from 'next/link';
import { GameListData } from 'types/types';
import { gravatar } from 'services/helpers';
import { useUser } from '@auth0/nextjs-auth0/client';
import { FadeWrapper } from './FadeWrapper';
import { DateTime } from 'luxon';
import { dismissFinished } from 'services/local';

export const GameListFinished = ({
  game,
  archiveFinishedGame
}: {
  game: GameListData;
  archiveFinishedGame: (gameId: number) => void;
}) => {
  const [fade, setFade] = React.useState(false);

  const { user } = useUser();
  if (!user) return null;

  const handleDismissFinished = () => {
    if (user && user.sub) {
      setFade(true);
      dismissFinished(game.game.id, user.sub);
      setTimeout(() => {
        archiveFinishedGame(game.game.id);
      }, 1100);
    }
  };

  if (game) {
    let playersList = '';
    let winner: GameListData['game']['users'][0] | undefined;
    let dismissed = game.finishedDismissed;

    game.game.users.forEach((player) => {
      if (player.userSub !== user.sub) {
        if (playersList.length == 0) {
          playersList = player.user.name;
        } else {
          playersList += ', ' + player.user.name;
        }
      }
      if (!winner) {
        winner = player;
      }
      if (winner.points < player.points) {
        winner = player;
      }
    });

    let winnerName = winner?.user.name;
    if (winner?.userSub === user.sub) {
      winnerName = 'Du';
    }

    let endTimeString = DateTime.fromISO(
      new Date(game.game.users[0].statusTime).toISOString()
    )
      .setLocale('sv')
      .toRelative({ style: 'long' });

    game.game.invitations.forEach((invitation) => {
      if (playersList.length == 0) {
        playersList = invitation.email;
      } else {
        playersList += ', ' + invitation.email;
      }
    });

    return (
      <FadeWrapper fade={fade} disableGutters>
        <Link passHref href={`/game/${game.game.id}`} style={{ flexGrow: 1 }}>
          <ListItemButton sx={{ p: 1, m: -1 }}>
            <ListItemAvatar sx={{ pr: 1, minWidth: '100px' }}>
              <AvatarGroup max={4} spacing={28}>
                {game.game.users.map(
                  (player, index) =>
                    user.sub !== player.userSub && (
                      <Avatar
                        sx={{ zIndex: index }}
                        key={index}
                        src={player.user.picture || gravatar(player.user.email)}
                      />
                    )
                )}
                {game.game.invitations.map((invitation, index) => (
                  <Avatar
                    sx={{ zIndex: 100 + index }}
                    key={100 + index}
                    src={gravatar(invitation.email)}
                  />
                ))}
              </AvatarGroup>
            </ListItemAvatar>
            <ListItemText
              sx={{
                '& .MuiListItemText-primary': {
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }
              }}
              primary={playersList}
              secondary={
                <>
                  <Typography variant="body2" color="text.secondary">
                    {'Spelet tog slut ' +
                      endTimeString +
                      '. ' +
                      winnerName +
                      ' vann!'}
                  </Typography>
                  {!dismissed && (
                    <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={(event) => {
                          event.stopPropagation();
                          event.nativeEvent.preventDefault();
                          handleDismissFinished();
                        }}
                      >
                        Arkivera
                      </Button>
                    </Stack>
                  )}
                </>
              }
            />
          </ListItemButton>
        </Link>
      </FadeWrapper>
    );
  } else {
    return (
      <ListItem disableGutters>
        <ListItemButton sx={{ p: 1, m: -1 }}>
          <ListItemAvatar sx={{ pr: 1, minWidth: '100px' }}>
            <AvatarGroup max={4} spacing={28}>
              <Skeleton variant="circular" sx={{ width: 40, height: 40 }} />
            </AvatarGroup>
          </ListItemAvatar>
          <ListItemText
            sx={{
              '& .MuiListItemText-primary': {
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }
            }}
            primary={<Skeleton variant="text" />}
            secondary={<Skeleton variant="text" />}
          />
        </ListItemButton>
      </ListItem>
    );
  }
};
