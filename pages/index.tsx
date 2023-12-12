import React from 'react';
import { Box } from '@mui/material';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { useUser } from '@auth0/nextjs-auth0/client';
import { GameList } from 'components/GameList';
import { Footer } from 'components/Footer';
import { Splash } from 'components/Splash';
import Head from 'next/head';
import { faviconString } from 'services/helpers';

const IndexPage: NextPage<{}> = () => {
  const { user, isLoading } = useUser(); // härifrån finns också error att ta ut

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Ordbjörn</title>
        </Head>
        <Splash />
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignContent: 'center',
          flexDirection: 'column',
          minHeight: '100%',
          backgroundColor: '#121212'
        }}
      >
        <Head>
          <link rel="icon" href={faviconString()} key="favicon" />
        </Head>
        {user ? (
          <>
            <Head>
              <title>Översikt | Ordbjörn</title>
            </Head>
            <Menu />
            <GameList />
          </>
        ) : (
          <>
            <Head>
              <title>Ordbjörn</title>
            </Head>
            <Splash />
          </>
        )}
        <Footer />
      </Box>
    </>
  );
};

export default IndexPage;
