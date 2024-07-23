import React, { useEffect, useState } from 'react';
import { ResponseType, WrongTurnData } from 'types/types';

const getWrongTurnData = async (): Promise<ResponseType<WrongTurnData[]>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/wrongturn/';
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
  let [wrongTurnData, setWrongTurnData] = useState<WrongTurnData[] | null>(
    null
  );

  const fetchWrongTurnData = async () => {
    let newWrongTurnData = await getWrongTurnData();

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
      <table>
        {wrongTurnData.map((game, index) => (
          <>
            <tr key={index}>
              <td style={{ borderBottom: '1px solid white' }}>
                <h4>
                  {game.id} ({game.finished ? '✅' : '❌'})
                </h4>
              </td>
              <td style={{ borderBottom: '1px solid white' }}>
                <ul>
                  {game.users.map((user, index) => (
                    <li key={index}>
                      {user.user.name} ({user.status}) (in latest turn:
                      {
                        game.turns[0].moves.filter(
                          (move) => move.userSub === user.user.sub
                        ).length
                      }
                      )
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          </>
        ))}
      </table>
    </>
  );
};
