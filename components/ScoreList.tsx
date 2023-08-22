import {
  Container,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  Modal,
  TableRow,
  Paper
} from '@mui/material';
import { Move, Turn } from '@prisma/client';
import { GameWithEverything } from 'types/types';
import { amber, blue, grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';
import { FinishedModal } from './FinishedModal';
import { useUser } from '@auth0/nextjs-auth0/client';

interface ScoreListProps {
  game: GameWithEverything;
}

export const ScoreList = ({ game }: ScoreListProps) => {
  const [userPoints, setUserPoints] = useState<
    { userSub: string; points: number }[]
  >([]);

  const [finishedModalOpen, setFinishedModalOpen] = useState(false);
  const handleCloseFinishedModal = () => setFinishedModalOpen(false);

  const { user } = useUser();

  useEffect(() => {
    let newUserPoints: { userSub: string; points: number }[] = [];

    game.users.map((user) => {
      let points = calculateUserPoints(
        user.userSub,
        game.turns,
        game.currentTurn
      );
      newUserPoints.push({ userSub: user.userSub, points: points });
    });

    setUserPoints(newUserPoints);
  }, [game]);

  useEffect(() => {
    if (game.finished) {
      setFinishedModalOpen(true);
    }
  }, [game.finished]);

  return (
    <Container maxWidth="sm" sx={{ flexShrink: 0, margin: 0 }}>
      <Modal
        open={finishedModalOpen}
        onClose={handleCloseFinishedModal}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper
          sx={{
            p: 3,
            m: 3,
            width: '100%',
            maxWidth: '400px'
          }}
          variant="outlined"
        >
          <FinishedModal
            game={game}
            userPoints={userPoints}
            handleCloseFinishedModal={handleCloseFinishedModal}
          />
        </Paper>
      </Modal>
      <TableContainer sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              {game.users.map((player) => (
                <TableCell key={player.userSub} style={{ fontWeight: 'bold' }}>
                  {player.user.name}
                  <SingleScorePoints
                    points={
                      userPoints.find((x) => x.userSub == player.userSub)
                        ?.points
                    }
                    won={
                      Math.max(...userPoints.map((x) => x.points)) ==
                      userPoints.find((x) => x.userSub == player.userSub)
                        ?.points
                    }
                  />
                </TableCell>
              ))}
              {game.invitations.map((invitation) => (
                <TableCell key={invitation.id} style={{ fontWeight: 'bold' }}>
                  {invitation.email}
                </TableCell>
              ))}
            </TableRow>
            {game.turns.map((turn) => (
              <TableRow key={turn.id}>
                <TableCell>{turn.turnNumber}</TableCell>
                {game.users.map((player) => (
                  <SingleScore
                    key={player.userSub}
                    isCurrentTurn={turn.turnNumber == game.currentTurn}
                    isSelf={player.userSub == user?.sub}
                    move={turn.moves.find(
                      (move) => move.userSub == player.userSub
                    )}
                  />
                ))}
                {game.invitations.map((invitation) => (
                  <TableCell key={invitation.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        flexDirection: 'row',
                        color: 'grey'
                      }}
                    >
                      (har ännu inte accepterat inbjudan)
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
        </Table>
      </TableContainer>
    </Container>
  );
};

interface SingleScoreProps {
  move?: Move;
  isCurrentTurn: boolean;
  isSelf: boolean;
}

export const SingleScore = ({
  move,
  isCurrentTurn,
  isSelf
}: SingleScoreProps) => {
  if (isCurrentTurn && !isSelf) {
    if (move) {
      return (
        <TableCell>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              flexDirection: 'row'
            }}
          >
            <SingleScorePoints points={'?'} won={false} />
          </div>
        </TableCell>
      );
    } else {
      return (
        <TableCell>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              flexDirection: 'row',
              color: 'grey'
            }}
          >
            (ännu ej lagt)
          </div>
        </TableCell>
      );
    }
  } else {
    if (move && move.playedWord && isCurrentTurn) {
      return (
        <TableCell>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              flexDirection: 'row'
            }}
          >
            {move.playedWord}
            <SingleScorePoints points={move.playedPoints} />
          </div>
        </TableCell>
      );
    } else if (move && move.playedWord && !isCurrentTurn) {
      return (
        <TableCell>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              flexDirection: 'row'
            }}
          >
            {move.playedWord}
            <SingleScorePoints points={move.playedPoints} won={move.won} />
          </div>
        </TableCell>
      );
    } else if (move && !move.playedWord) {
      return (
        <TableCell>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              flexDirection: 'row',
              color: 'grey'
            }}
          >
            (pass)
          </div>
        </TableCell>
      );
    } else {
      return <TableCell></TableCell>;
    }
  }
};

export const SingleScorePoints = ({
  points,
  won
}: {
  points?: number | string;
  won?: boolean;
}) => {
  if (typeof points === 'undefined') {
    points = 0;
  }
  let pointsColor;
  let textColor;
  if (typeof points === 'string' || typeof won === 'undefined') {
    pointsColor = grey[500];
    textColor = 'white';
  } else if (won === true) {
    pointsColor = amber[500];
    textColor = 'black';
  } else if (won === false) {
    pointsColor = blue[500];
    textColor = 'white';
  }
  return (
    <>
      &nbsp;
      <span
        style={{
          backgroundColor: pointsColor,
          color: textColor,
          fontSize: '0.85em',
          padding: '4px',
          borderRadius: '8px',
          lineHeight: 0.8
        }}
      >
        {points}
      </span>
    </>
  );
};

export const calculateUserPoints = (
  userSub: string,
  turns: (Turn & {
    moves: Move[];
  })[],
  currentTurn: number
) => {
  let points = 0;
  turns.map((turn) =>
    turn.moves.map((move) => {
      if (move.userSub == userSub && turn.turnNumber !== currentTurn) {
        points += move.playedPoints;
      }
    })
  );

  return points;
};
