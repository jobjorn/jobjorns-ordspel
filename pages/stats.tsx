import React from 'react';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { useUser, withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Footer } from 'components/Footer';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Typography } from '@mui/material';
import { faviconString } from 'services/helpers';
import Head from 'next/head';
import { Loading } from 'components/Loading';
import { UsersByPeriod } from 'components/stats/UsersByPeriod';

export const StatsPage: NextPage<{}> = () => {
  const { user, isLoading } = useUser(); // härifrån finns också error att ta ut

  if (isLoading || !user) {
    return <Loading />;
  }

  return (
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
        <title>Statistik | Ordbjörn</title>
        <link rel="icon" href={faviconString()} key="favicon" />
      </Head>
      <Menu />
      <Container maxWidth="lg" sx={{ flexGrow: 1 }}>
        <Typography variant="h4" sx={{}}>
          Statistik
        </Typography>
        <UsersByPeriod />
      </Container>
      <Footer />
    </Box>
  );
};

export default withPageAuthRequired(StatsPage);
