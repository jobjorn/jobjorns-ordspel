import React, { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Container,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Typography
} from '@mui/material';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getUpdatedInvitations, listGames } from 'services/local';
import { GameListData } from 'types/types';
import { GameListListItem } from './GameListItem';
import { GameInviteListItem } from './GameListInvite';
import { GameListRefusal } from './GameListRefusal';
import Head from 'next/head';
import { faviconString } from 'services/helpers';
import { GameListFinished } from './GameListFinished';
import { ExpandLess, ExpandMore } from '@mui/icons-material';

export const GameList: React.FC<{}> = () => {
  const [loading, setLoading] = useState(true);
  // const [userWithId, setUserWithId] = useState<User>();
  const [gamesList, setGamesList] = useState<GameListData[]>([]);
  const [gamesListInvites, setGamesListInvites] = useState<GameListData[]>([]);
  const [gamesListRefusals, setGamesListRefusals] = useState<GameListData[]>(
    []
  );
  const [gamesListFinishedNotDismissed, setGamesListFinishedNotDismissed] =
    useState<GameListData[]>([]);
  const [gamesListWaiting, setGamesListWaiting] = useState<GameListData[]>([]);
  const [gamesListReady, setGamesListReady] = useState<GameListData[]>([]);
  const [gamesListFinished, setGamesListFinished] = useState<GameListData[]>(
    []
  );
  const [favicon, setFavicon] = useState<string>('');
  const [updatedInvitationsToggle, setUpdatedInvitationsToggle] =
    useState<boolean>(false);

  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [showOlderFinished, setShowOlderFinished] = useState<boolean>(false);

  const { user } = useUser();

  const inactiveDate = new Date(new Date().setMonth(new Date().getMonth() - 1));

  useEffect(() => {
    const fetchGamesList = async () => {
      if (user && user.sub) {
        const newGamesList = await listGames(user.sub);

        if (newGamesList.success) {
          setGamesList(newGamesList.data);
        }
      }
      setLoading(false);
    };

    fetchGamesList();
  }, [user, updatedInvitationsToggle]);

  useEffect(() => {
    const fetchUpdatedInvitations = async () => {
      if (user && user.email && user.sub) {
        const newUpdatedInvitations = await getUpdatedInvitations(
          user.email,
          user.sub
        );

        if (
          newUpdatedInvitations.success &&
          newUpdatedInvitations.data &&
          newUpdatedInvitations.data.length > 0
        ) {
          setUpdatedInvitationsToggle(true);
        }
      }
    };

    fetchUpdatedInvitations();
  }, [user]);

  useEffect(() => {
    if (user && user.sub && gamesList.length > 0) {
      let newGamesListInvites: GameListData[] = [];
      let newGamesListFinishedNotDismissed: GameListData[] = [];
      let newGamesListRefusals: GameListData[] = [];
      let newGamesListReady: GameListData[] = [];
      let newGamesListWaiting: GameListData[] = [];
      let newGamesListFinished: GameListData[] = [];

      gamesList.map((game) => {
        if (game.status == 'FINISHED' && game.finishedDismissed == false) {
          newGamesListFinishedNotDismissed.push(game);
        } else if (game.status == 'FINISHED') {
          newGamesListFinished.push(game);
        } else if (game.status == 'INVITED') {
          newGamesListInvites.push(game);
        } else if (game.status == 'REFUSED') {
          newGamesListRefusals.push(game);
        } else if (game.status == 'OTHERTURN') {
          newGamesListWaiting.push(game);
        } else {
          newGamesListReady.push(game);
        }
      });

      setGamesListInvites(newGamesListInvites);
      setGamesListRefusals(newGamesListRefusals);
      setGamesListFinishedNotDismissed(newGamesListFinishedNotDismissed);
      setGamesListWaiting(newGamesListWaiting);
      setGamesListReady(newGamesListReady);
      setGamesListFinished(newGamesListFinished);
    }
  }, [user, gamesList]);

  useEffect(() => {
    const newFavicon = faviconString(gamesListReady.length);

    setFavicon(newFavicon);
  }, [gamesListReady]);

  const removeGameFromList = (gameId: number) => {
    const newGamesList = gamesList.filter((game) => game.gameId != gameId);

    setGamesList(newGamesList);
  };

  const archiveFinishedGame = (gameId: number) => {
    const updatedGamesList = gamesList.map((game) => {
      if (game.gameId === gameId) {
        return { ...game, finishedDismissed: true };
      }
      return game;
    });

    setGamesList(updatedGamesList);
  };

  if (gamesList.length == 0 && !loading) {
    return (
      <Container maxWidth="sm">
        <Typography variant="h4" sx={{ my: 3 }}>
          Du har inga spel än. Skapa ett nytt spel nedan!
        </Typography>
        <Button variant="contained" href="/game/new">
          Skapa nytt spel
        </Button>
      </Container>
    );
  } else if (gamesList && !loading && user) {
    return (
      <Container maxWidth="sm" sx={{ flexGrow: 1 }}>
        {favicon && (
          <Head>
            <link rel="icon" href={favicon} key="favicon" />
            {gamesListReady.length > 0 && (
              <title>{'(' + gamesListReady.length + ') Ordbjörn'}</title>
            )}
          </Head>
        )}

        {gamesListInvites.length > 0 && (
          <>
            <Typography variant="h4" sx={{}}>
              Inbjudningar
            </Typography>
            <List>
              {gamesListInvites.map((game) => (
                <GameInviteListItem
                  key={game.game.id}
                  game={game.game}
                  removeGameFromList={removeGameFromList}
                />
              ))}
            </List>
          </>
        )}

        {gamesListRefusals.length > 0 && (
          <>
            <Typography variant="h4" sx={{}}>
              Avvisade inbjudningar
            </Typography>
            <List>
              {gamesListRefusals.map((game) => (
                <GameListRefusal
                  key={game.game.id}
                  game={game.game}
                  removeGameFromList={removeGameFromList}
                />
              ))}
            </List>
          </>
        )}

        {gamesListFinishedNotDismissed.length > 0 && (
          <>
            <Typography variant="h4" sx={{}}>
              Nyligen avslutade spel
            </Typography>
            <List>
              {gamesListFinishedNotDismissed.map((game) => (
                <GameListFinished
                  key={game.game.id}
                  game={game}
                  archiveFinishedGame={archiveFinishedGame}
                />
              ))}
            </List>
          </>
        )}

        {(gamesListReady.length > 0 || gamesListWaiting.length > 0) && (
          <>
            <Typography variant="h4" sx={{}}>
              Pågående spel
            </Typography>

            <List>
              {gamesListReady.length > 0 && (
                <ListSubheader style={{ zIndex: 200 }}>
                  Väntar på ditt drag
                </ListSubheader>
              )}

              {gamesListReady.map((game) => (
                <GameListListItem key={game.game.id} game={game.game} />
              ))}

              {gamesListWaiting.length > 0 && (
                <ListSubheader style={{ zIndex: 200 }}>
                  Väntar på andras drag
                </ListSubheader>
              )}
              {gamesListWaiting
                .filter((game) => new Date(game.statusTime) > inactiveDate)
                .map((game) => (
                  <GameListListItem key={game.game.id} game={game.game} />
                ))}

              {gamesListWaiting.filter(
                (game) => new Date(game.statusTime) < inactiveDate
              ).length > 0 && (
                <ListItemButton onClick={() => setShowInactive(!showInactive)}>
                  <ListItemText primary="Visa inaktiva spel" />
                  {showInactive ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              )}

              {showInactive &&
                gamesListWaiting
                  .filter((game) => new Date(game.statusTime) < inactiveDate)
                  .map((game) => (
                    <GameListListItem key={game.game.id} game={game.game} />
                  ))}
            </List>
          </>
        )}

        {gamesListFinished.length > 0 && (
          <>
            <Typography variant="h4" sx={{}}>
              Avslutade spel
            </Typography>
            <List>
              {gamesListFinished
                .filter((game) => new Date(game.statusTime) > inactiveDate)
                .map((game) => (
                  <GameListFinished
                    key={game.game.id}
                    game={game}
                    archiveFinishedGame={archiveFinishedGame}
                  />
                ))}

              {gamesListFinished.filter(
                (game) => new Date(game.statusTime) < inactiveDate
              ).length > 0 && (
                <ListItemButton
                  onClick={() => setShowOlderFinished(!showOlderFinished)}
                >
                  <ListItemText primary="Visa äldre spel" />
                  {showOlderFinished ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              )}

              {showOlderFinished &&
                gamesListFinished
                  .filter((game) => new Date(game.statusTime) < inactiveDate)
                  .map((game) => (
                    <GameListFinished
                      key={game.game.id}
                      game={game}
                      archiveFinishedGame={archiveFinishedGame}
                    />
                  ))}
            </List>
          </>
        )}
      </Container>
    );
  } else {
    return (
      <Container maxWidth="sm" style={{ textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
};
