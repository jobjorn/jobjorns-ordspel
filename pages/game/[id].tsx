import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { useUser, withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Footer } from 'components/Footer';
import { getGame, getUser } from 'services/local';
import { GameWithEverything } from 'types/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import router from 'next/router';
import { Board } from 'components/Board';
import { User } from '@prisma/client';
import { ScoreList } from 'components/ScoreList';
import Head from 'next/head';
import { faviconString } from 'services/helpers';
import { Loading } from 'components/Loading';

const NewGamePage: NextPage<{}> = () => {
  const [game, setGame] = useState<GameWithEverything>();
  const [userWithId, setUserWithId] = useState<User>();

  const { user } = useUser();

  const gameId = parseInt(router.query.id as string, 10);

  useEffect(() => {
    const fetchUserWithId = async () => {
      if (user && user.email) {
        const newUserWithId = await getUser(user.email);

        if (newUserWithId.success) {
          setUserWithId(newUserWithId.data);
        }
      }
    };

    fetchUserWithId();
  }, [user]);

  const fetchGame = async (gameId: number) => {
    if (gameId > 0) {
      const newGame = await getGame(gameId);

      if (newGame.success && newGame.data) {
        setGame(newGame.data);
      } else {
        router.push('/');
      }
    }
  };

  useEffect(() => {
    fetchGame(gameId);
  }, [gameId]);

  if (game && userWithId) {
    let userInGame = game.users.findIndex((u) => u.userSub === userWithId.sub);

    if (userInGame > -1 || userWithId.role === 'ADMIN') {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            flexDirection: 'column',
            minHeight: '100%',
            backgroundColor: '#121212'
          }}
        >
          <Head>
            <title>Ordbjörn</title>
            <link rel="icon" href={faviconString()} key="favicon" />
          </Head>
          <Menu />
          <Container
            maxWidth="xl"
            sx={{
              flexGrow: 1,
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              p: 0,
              '@media (min-width: 600px)': {
                p: 0
              }
            }}
          >
            <Board game={game} user={userWithId} fetchGame={fetchGame} />
            <ScoreList game={game} />
          </Container>
          <Footer />
        </Box>
      );
    } else {
      router.push('/');

      return <Loading />;
    }
  } else {
    return <Loading />;
  }
};

export default withPageAuthRequired(NewGamePage);
