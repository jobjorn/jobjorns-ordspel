import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { Footer } from 'components/Footer';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Alert } from '@mui/material';
import { faviconString } from 'services/helpers';
import Head from 'next/head';
import { Loading } from 'components/Loading';
import { getTurnOffReminders } from 'services/local';
import { useRouter } from 'next/router';
import { Alert as AlertType } from 'types/types';

const StopRemindersPage: NextPage<{}> = () => {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<AlertType>();

  const router = useRouter();
  let key = router.query.key;

  useEffect(() => {
    const fetchTurnOffReminders = async (key: string) => {
      if (key) {
        const turnOffResult = await getTurnOffReminders(key);

        if (turnOffResult.success && turnOffResult.data) {
          if (turnOffResult.data.receiveReminders) {
            setAlert({
              severity: 'error',
              message: 'Något gick fel, försök igen eller kontakta utvecklaren.'
            });
          } else {
            setAlert({
              severity: 'success',
              message:
                'Påminnelser har stängts av för ' +
                turnOffResult.data.name +
                '.'
            });
          }
          setLoading(false);
        } else {
          console.log(turnOffResult);
          setAlert({
            severity: 'error',
            message:
              'Något gick fel när påminnelser skulle stängas av, försök igen eller kontakta utvecklaren.'
          });
          setLoading(false);
        }
      }
    };

    if (typeof key === 'string') {
      fetchTurnOffReminders(key);
    }
  }, [key]);

  if (!loading && alert) {
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
          <title>Stäng av påminnelser | Ordbjörn</title>
          <link rel="icon" href={faviconString()} key="favicon" />
        </Head>
        <Menu />
        <Container maxWidth="sm" sx={{ flexGrow: 1 }}>
          <Alert
            severity={alert.severity}
            sx={{
              margin: '3px',
              bgcolor: 'background.paper'
            }}
            variant="outlined"
          >
            {alert.message}
          </Alert>
        </Container>
        <Footer />
      </Box>
    );
  } else {
    return <Loading />;
  }
};

export default StopRemindersPage;
