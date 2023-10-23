import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { useUser, withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Footer } from 'components/Footer';
import { listUsers, startGame } from 'services/local';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import { faviconString, gravatar } from 'services/helpers';
import Head from 'next/head';
import { Loading } from 'components/Loading';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { z } from 'zod';
import { UserListData } from 'types/types';

const NewGamePage: NextPage<{}> = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserListData[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserListData[]>([]);
  const [email, setEmail] = useState<string>('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<boolean>(false);

  const { user } = useUser();

  const toggleUser = (user: UserListData) => {
    let newSelectedUsers = [...selectedUsers];

    const index = newSelectedUsers.indexOf(user);
    if (index === -1) {
      newSelectedUsers.push(user);
    } else {
      newSelectedUsers.splice(index, 1);
    }

    setSelectedUsers(newSelectedUsers);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const newUsers = await listUsers();
      if (newUsers.success) {
        setUsers(newUsers.data.sort((a, b) => -b.name.localeCompare(a.name)));
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const emailSchema = z.string().email();

    if (email.length == 0) {
      setEmailError(false);
    } else {
      setEmailError(!emailSchema.safeParse(email).success);
    }
  }, [email]);

  const addEmail = (email: string) => {
    if (emailList.indexOf(email) == -1) {
      setEmailList([...emailList, email]);
      setEmail('');
    }
  };

  const removeEmail = (email: string) => {
    let newEmailList = [...emailList];
    setEmailList(newEmailList.filter((e) => e !== email));
  };

  if (user && !loading) {
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
          <title>Nytt spel | Ordbjörn</title>
          <link rel="icon" href={faviconString()} key="favicon" />
        </Head>
        <Menu />
        <Container maxWidth="sm" sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{}}>
            Starta nytt spel
          </Typography>
          <List>
            {users.map(
              (listUser, index) =>
                user.sub !== listUser.sub && (
                  <ListItem
                    key={index}
                    onClick={() => toggleUser(listUser)}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedUsers.indexOf(listUser) !== -1}
                      />
                    }
                    disablePadding
                  >
                    <ListItemButton
                      selected={selectedUsers.indexOf(listUser) !== -1}
                    >
                      <ListItemAvatar>
                        {listUser.picture ? (
                          <Avatar src={listUser.picture} />
                        ) : (
                          <Avatar>{listUser.name[0]}</Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText primary={listUser.name} />
                    </ListItemButton>
                  </ListItem>
                )
            )}
            {emailList.map((email, index) => (
              <ListItem
                key={index}
                onClick={() => removeEmail(email)}
                secondaryAction={<Checkbox edge="end" checked={true} />}
                disablePadding
              >
                <ListItemButton selected={true}>
                  <ListItemAvatar>
                    <Avatar src={gravatar(email)} />
                  </ListItemAvatar>
                  <ListItemText primary={email} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Stack direction="row" spacing={1} sx={{ my: 1 }}>
            <FormControl variant="outlined" fullWidth>
              <InputLabel htmlFor="outlined-adornment-email" error={emailError}>
                E-postadress
              </InputLabel>
              <OutlinedInput
                id="outlined-adornment-email"
                type={'text'}
                label="E-postadress"
                value={email}
                error={emailError}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setEmail(event.target.value);
                }}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      disabled={emailError || email.length == 0}
                      onClick={() => {
                        addEmail(email);
                      }}
                      edge="end"
                      sx={{ mr: 0.25 }}
                    >
                      {<PersonAddAlt1Icon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
          </Stack>
          {emailList.length > 0 && (
            <Alert severity="info" sx={{ mb: 1 }} variant="outlined">
              {emailList.length} spelare kommer att bjudas in via e-post om de
              inte redan har konto.
            </Alert>
          )}
          <Stack direction="row" spacing={1} sx={{ my: 1 }}>
            <Button
              disabled={selectedUsers.length + emailList.length < 1}
              variant="contained"
              onClick={() => startGame(selectedUsers, emailList)}
            >
              Bjud in {selectedUsers.length + emailList.length} spelare
            </Button>
          </Stack>
        </Container>
        <Footer />
      </Box>
    );
  } else {
    return <Loading />;
  }
};

export default withPageAuthRequired(NewGamePage);
