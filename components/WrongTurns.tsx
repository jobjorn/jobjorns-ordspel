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
      <table style={{ borderCollapse: 'collapse' }}>
        {wrongTurnData.map((game, index) => (
          <WrongTurnRow key={index} game={game} />
        ))}
      </table>
    </>
  );
};

export const WrongTurnRow = ({ game }: { game: WrongTurnsData }) => {
  let errorInStatus = false;
  game.users.forEach((user) => {
    if (
      user.status === 'OTHERTURN' &&
      game.turns[0].moves.filter((move) => move.userSub === user.user.sub)
        .length === 0
    ) {
      errorInStatus = true;
    } else if (
      user.status === 'YOURTURN' &&
      game.turns[0].moves.filter((move) => move.userSub === user.user.sub)
        .length > 0
    ) {
      errorInStatus = true;
    }
  });

  return (
    <>
      {game.users.map((user, index) => (
        <tr key={index}>
          {index === 0 && (
            <>
              <td
                style={{ borderBottom: '1px solid white' }}
                rowSpan={game.users.length}
              >
                {game.id}
              </td>

              <td
                style={{ borderBottom: '1px solid white' }}
                rowSpan={game.users.length}
              >
                {game.finished ? ' 🏁' : ''}
              </td>
            </>
          )}
          <td style={{ borderBottom: '1px solid white' }}>{user.user.name}</td>
          <StatusTd status={user.status}>{user.status}</StatusTd>
          <td style={{ borderBottom: '1px solid white' }}>
            (in latest turn:
            {
              game.turns[0].moves.filter(
                (move) => move.userSub === user.user.sub
              ).length
            }
            )
          </td>

          {index === 0 && (
            <td
              style={{ borderBottom: '1px solid white' }}
              rowSpan={game.users.length}
            >
              {errorInStatus ? <FixButton gameId={game.id} /> : '🦖'}
            </td>
          )}
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
      : 'black',
  borderBottom: '1px solid white'
}));

const FixButton = ({ gameId }: { gameId: number }) => {
  const [loading, setLoading] = useState(false);

  const fixGame = async () => {
    setLoading(true);

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

      setLoading(false);

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

  return (
    <Button variant="contained" onClick={fixGame}>
      {loading ? '...' : 'Fixa'}
    </Button>
  );
};
