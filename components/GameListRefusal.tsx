import React from 'react';
import {
  Button,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { GameListData } from 'types/types';
import { dismissRefusal } from 'services/local';
import { useUser } from '@auth0/nextjs-auth0/client';
import { DateTime } from 'luxon';
import { FadeWrapper } from './FadeWrapper';

export const GameListRefusal = ({
  game,
  removeGameFromList
}: {
  game: GameListData['game'];
  removeGameFromList: (gameId: number) => void;
}) => {
  const [fade, setFade] = React.useState(false);

  const { user } = useUser();
  if (!user) return null;

  const handleDismissRefusal = () => {
    if (user && user.sub) {
      setFade(true);
      dismissRefusal(game.id, user.sub);
      setTimeout(() => {
        removeGameFromList(game.id);
      }, 1100);
    }
  };

  if (game) {
    let startTimeString = DateTime.fromISO(
      new Date(game.startedAt).toISOString()
    )
      .setLocale('sv')
      .toRelative({ style: 'long' });

    return (
      <FadeWrapper fade={fade} disableGutters>
        <ListItemAvatar sx={{ pr: 1, minWidth: '100px' }}></ListItemAvatar>
        <ListItemText
          disableTypography
          primary={<Typography>Alla inbjudna spelare tackade nej</Typography>}
          secondary={
            <>
              <Typography variant="body2" color="text.secondary">
                {'Inbjudan skickades ' + startTimeString}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    handleDismissRefusal();
                  }}
                >
                  Avvisa
                </Button>
              </Stack>
            </>
          }
        />
      </FadeWrapper>
    );
  } else {
    return (
      <FadeWrapper fade={fade} disableGutters>
        <ListItemText
          disableTypography
          primary={<Typography>Alla inbjudna spelare tackade nej</Typography>}
          secondary={
            <>
              <Typography variant="body2" color="text.secondary">
                {'Inbjudan skickades ' +
                <Skeleton variant="text" width={100} />}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    handleDismissRefusal();
                  }}
                >
                  Avvisa
                </Button>
              </Stack>
            </>
          }
        />
      </FadeWrapper>
    );
  }
};
