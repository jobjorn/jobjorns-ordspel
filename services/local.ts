import { Invitation, User } from '@prisma/client';
import router from 'next/router';
import {
  ResponseType,
  GameWithEverything,
  GameListData,
  UserListData,
  Tile
} from 'types/types';

/*
används ej längre, addUser körs från Auth0 numera

export const addUser = (user: UserProfile) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/users';
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      sub: user.sub,
      name: user.name,
      picture: user.picture,
      email: user.email
    })
  };
  // här behöver vi deala med resultatet på ett rimligare sätt
  fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        response.json().catch((error) => {
          console.error(error);
        });
      } else {
        console.error(response.status);
      }
    })
    .catch((error) => {
      console.error(error);
    });
};
*/

export const getUser = (email: string): Promise<ResponseType<User>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/users/' + email;
  const options = {
    method: 'GET',
    headers: defaultHeaders
  };
  return fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .then((response) => {
      return {
        success: true as const,
        data: response.data
      };
    })
    .catch((error) => {
      return {
        success: false,
        error: error
      };
    });
};

export const listUsers = (): Promise<ResponseType<UserListData[]>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/users';
  const options = {
    method: 'GET',
    headers: defaultHeaders
  };
  return fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .then((response) => {
      return {
        success: true as const,
        data: response.data
      };
    })
    .catch((error) => {
      return {
        success: false,
        error: error
      };
    });
};

export const startGame = (players: UserListData[], emailList: string[]) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games';
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ players, emailList })
  };
  fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .then((response) => {
      router.push('/game/' + response.id);
    })
    .catch((error) => {
      return {
        success: false,
        error: error
      };
    });
};

export const getGame = (
  id: number
): Promise<ResponseType<GameWithEverything>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games/' + id;
  const options = {
    method: 'GET',
    headers: defaultHeaders
  };

  return fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .then((response) => {
      return {
        success: true as const,
        data: response.data
      };
    })
    .catch((error) => {
      return {
        success: false,
        error: error
      };
    });
};

export const listGames = (
  userSub: string
): Promise<ResponseType<GameListData[]>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games?usersub=' + userSub;
  const options = {
    method: 'GET',
    headers: defaultHeaders
  };
  return fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .then((response) => {
      return {
        success: true as const,
        data: response.data
      };
    })
    .catch((error) => {
      return {
        success: false as const,
        error: error
      };
    });
};

export const submitMove = async (
  gameId: number,
  turnNumber: number,
  playedWord: string,
  playedBoard: Tile[][]
) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games/' + gameId;
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      variant: 'move',
      turnNumber,
      playedWord,
      playedBoard
    })
  };

  try {
    const moveResult = await (await fetch(url, options)).json();
    return moveResult;
  } catch (error) {
    return { success: false as const, message: 'Något gick fel!' };
  }
};

export const acceptInvite = async (gameId: number, userSub: string) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games/' + gameId;
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ variant: 'accept', userSub })
  };

  try {
    const acceptResult = await (await fetch(url, options)).json();

    return { accept: acceptResult };
  } catch (error) {
    return {
      accept: { success: false, response: error }
    };
  }
};

export const declineInvite = async (gameId: number, userSub: string) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games/' + gameId;
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ variant: 'decline', userSub })
  };

  try {
    const declineResult = await (await fetch(url, options)).json();

    return { decline: declineResult };
  } catch (error) {
    return {
      decline: { success: false, response: error }
    };
  }
};

export const dismissRefusal = async (gameId: number, userSub: string) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games/' + gameId;
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ variant: 'dismissRefusal', userSub })
  };

  try {
    const dismissResult = await (await fetch(url, options)).json();

    return { dismiss: dismissResult };
  } catch (error) {
    return {
      dismiss: { success: false, response: error }
    };
  }
};

export const dismissFinished = async (gameId: number, userSub: string) => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/games/' + gameId;
  const options = {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ variant: 'dismissFinished', userSub })
  };

  try {
    const dismissResult = await (await fetch(url, options)).json();

    return { dismiss: dismissResult };
  } catch (error) {
    return {
      dismiss: { success: false, response: error }
    };
  }
};

export const getUpdatedInvitations = (
  email: string,
  sub: string
): Promise<ResponseType<Invitation[]>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/invitations?email=' + email + '&sub=' + sub;
  const options = {
    method: 'GET',
    headers: defaultHeaders
  };

  return fetch(url, options)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error(response.statusText);
      }
    })
    .then((response) => {
      return {
        success: true as const,
        data: response.data
      };
    })
    .catch((error) => {
      return {
        success: false,
        error: error
      };
    });
};

export const updateUser = async (user: User): Promise<ResponseType<User>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/user/';
  const options = {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify({
      settingVisibility: user.settingVisibility,
      receiveReminders: user.receiveReminders
    })
  };

  try {
    const updatedUser = await (await fetch(url, options)).json();

    return { success: true as const, data: updatedUser };
  } catch (error) {
    return {
      success: false as const,
      error: error as Error
    };
  }
};

export const getTurnOffReminders = async (
  key: string
): Promise<ResponseType<User>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/user/turnoffreminders';
  const options = {
    method: 'PATCH',
    headers: defaultHeaders,
    body: JSON.stringify({ key })
  };

  try {
    const updatedUser = await (await fetch(url, options)).json();

    if (updatedUser && updatedUser.name) {
      return { success: true as const, data: updatedUser };
    } else {
      throw new Error('Något gick fel');
    }
  } catch (error) {
    return {
      success: false as const,
      error: error as Error
    };
  }
};
