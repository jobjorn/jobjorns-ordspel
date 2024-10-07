import React, { useEffect, useState } from 'react';
import { ResponseType, WrongTurnsData } from 'types/types';
import styled from '@emotion/styled';
import { Button } from '@mui/material';

const getWrongTurnsData = async (): Promise<ResponseType<WrongTurnsData[]>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/admin/wrongturns/';
  const options = {
    method: 'GET',
    headers: defaultHeaders
  };

  try {
    let response = await fetch(url, options).then((res) => res.json());

    if (response.data) {
      return {
        success: true,
        data: response.data
      };
    } else {
      throw new Error('No data');
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error
      };
    } else {
      return {
        success: false,
        error: new Error('Unknown error')
      };
    }
  }
};

export const WrongTurns = () => {
  let [wrongTurnData, setWrongTurnData] = useState<WrongTurnsData[] | null>(
    null
  );

  const fetchWrongTurnData = async () => {
    let newWrongTurnData = await getWrongTurnsData();

    if (newWrongTurnData.success && newWrongTurnData.data) {
      setWrongTurnData(newWrongTurnData.data);
    }
  };

  useEffect(() => {
    fetchWrongTurnData();
  }, []);

  if (!wrongTurnData) {
    return <h2>herping</h2>;
  }

  return (
    <>
      <h2>Wrong turns</h2>
      <table style={{}}>
        <thead>
          <tr>
            <th>Användare</th>
            <th>Status</th>
            <th>Drag senaste turen</th>
            <th>Fixa?</th>
          </tr>
        </thead>
        <tbody>
          {wrongTurnData.map((game, index) => (
            <WrongTurnRow key={index} game={game} />
          ))}
        </tbody>
      </table>
    </>
  );
};

export const WrongTurnRow = ({ game }: { game: WrongTurnsData }) => {
  let errorInStatus = false;
  let yourTurn = false;
  game.users.forEach((user) => {
    // Om spelet är avslutat och användaren inte är avslutad
    if (user.status !== 'FINISHED' && game.finished) {
      errorInStatus = true;
    }
    // Om det inte är användarens tur och användaren inte har gjort något drag
    else if (
      user.status === 'OTHERTURN' &&
      game.turns[0].moves.filter((move) => move.userSub === user.user.sub)
        .length === 0
    ) {
      errorInStatus = true;
    }
    // Om det är användarens tur och användaren har gjort ett drag,
    // såvida inte alla gjort ett drag
    else if (
      user.status === 'YOURTURN' &&
      game.turns.length > 0 &&
      game.turns[0].moves.filter((move) => move.userSub === user.user.sub)
        .length > 0
    ) {
      yourTurn = true;
      errorInStatus = true;
    }
    // Om det är någons tur
    else if (user.status === 'YOURTURN' || user.status === 'INVITED') {
      yourTurn = true;
    }
  });

  // Om det inte är någons tur och spelet inte är avslutat
  if (!yourTurn && !game.finished && game.invitations.length === 0) {
    errorInStatus = true;
  }

  return (
    <>
      {game.users.length > 0 && (
        <tr>
          <td style={{ fontSize: '2em' }}>
            {game.id}
            {game.finished ? ' 🏁' : ''}
          </td>
        </tr>
      )}
      {game.users.map((user, index) => (
        <tr key={index * 2}>
          <td>{user.user.name}</td>
          <StatusTd status={user.status}>{user.status}</StatusTd>
          <td>
            (in latest turn:
            {game.turns.length > 0
              ? game.turns[0].moves.filter(
                  (move) => move.userSub === user.user.sub
                ).length
              : 0}
            )
          </td>

          {index === 0 && (
            <td rowSpan={game.users.length + game.invitations.length}>
              {errorInStatus ? <FixButton gameId={game.id} /> : ''}
            </td>
          )}
        </tr>
      ))}
      {game.invitations.map((invitation, index) => (
        <tr key={index * 2 + 1}>
          <td>{invitation.email}</td>
          <StatusTd status="INVITED">INVITED</StatusTd>
          <td>(invited)</td>
        </tr>
      ))}
    </>
  );
};

const StatusTd = styled('td')<{ status: string }>(({ status }) => ({
  backgroundColor:
    status === 'OTHERTURN'
      ? '#f44336'
      : status === 'YOURTURN'
      ? '#4caf50'
      : status === 'FINISHED'
      ? '#3f51b5'
      : status === 'INVITED'
      ? '#ffc107'
      : 'black'
}));

const fixGameSubmit = async (gameId: number) => {
  const url = '/api/admin/wrongturns/' + gameId;
  const options = {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UTF-8'
    }
  };

  try {
    let response = await fetch(url, options).then((res) => res.json());

    if (response) {
      return {
        success: true,
        data: response.message
      };
    } else {
      throw new Error('No data');
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error
      };
    } else {
      return {
        success: false,
        error: new Error('Unknown error')
      };
    }
  }
};

const FixButton = ({ gameId }: { gameId: number }) => {
  const [loading, setLoading] = useState(false);
  const [fixResponse, setFixResponse] = useState<string>('');

  const fixGame = async () => {
    setLoading(true);

    let response = await fixGameSubmit(gameId);

    if (response.success && response.data) {
      setFixResponse('✅');
      setLoading(false);
    }
  };

  if (fixResponse) {
    return <p>{fixResponse}</p>;
  } else {
    return (
      <Button variant="contained" onClick={fixGame}>
        {loading ? '...' : 'Fixa'}
      </Button>
    );
  }
};
