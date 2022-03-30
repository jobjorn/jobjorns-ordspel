import React from 'react';
import { Box, CircularProgress, Container } from '@mui/material';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { useUser } from '@auth0/nextjs-auth0';
import { Board } from 'components/Board';
import { Footer } from 'components/Footer';
import { Splash } from 'components/Splash';

const IndexPage: NextPage<{}> = () => {
  const { user, error, isLoading } = useUser();

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: 'column',
          height: '100vh'
        }}
      >
        {isLoading ? (
          <Container maxWidth="sm">
            <CircularProgress />
          </Container>
        ) : user ? (
          <>
            <Menu />
            <Container maxWidth="sm">
              <Board />
            </Container>
          </>
        ) : (
          <Splash />
        )}
        <Footer />
      </Box>
    </>
  );
};

export default IndexPage;
