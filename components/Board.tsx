import React, { useEffect, useState } from 'react';
import {
  Alert,
  Backdrop,
  Button,
  Container,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  styled
} from '@mui/material';
import { defaultBoard } from 'data/defaults';
import {
  GameWithEverything,
  Tile as TileType,
  Alert as AlertType
} from 'types/types';
import { User } from '@prisma/client';
import { submitMove } from 'services/local';
import { Tile } from './Tile';
import { faviconString, shuffleArray } from 'services/helpers';
import {
  checkAdjacentPlacement,
  checkCoherentWord,
  checkSameDirection,
  checkTilesPlayed,
  getPlayedWords,
  tilePoints,
  wordPoints
} from 'services/game';
import Ably from 'ably';
import Head from 'next/head';
import { TileHolder } from './TileHolder';

const emptyTile: TileType = {
  letter: '',
  placed: 'no'
};

interface BoardProps {
  game: GameWithEverything;
  user: User;
  fetchGame: (gameId: number) => void;
}

export const Board = ({ game, user: currentUser, fetchGame }: BoardProps) => {
  const [unplayedBoard, setUnplayedBoard] = useState<TileType[][]>(
    defaultBoard()
  );
  const [tiles, setTiles] = useState<TileType[]>([]);
  const [selectedTile, setSelectedTile] = useState<TileType>(emptyTile);
  const [playerHasSubmitted, setPlayerHasSubmitted] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [backdrop, setBackdrop] = useState<boolean>(false);
  const [shakingTiles, setShakingTiles] = useState<number[]>([]);
  const [placedTiles, setPlacedTiles] = useState<number[]>([]);
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [bonusPoints, setBonusPoints] = useState<number>(0);
  const [nameList, setNameList] = useState<string>('');

  const addAlerts = (newAlerts: AlertType[]) => {
    setAlerts([...alerts, ...newAlerts]);
    setBackdrop(true);
  };
  const handleBackdropClose = () => {
    setAlerts([]);
    setBackdrop(false);
  };

  useEffect(() => {
    const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_SUBSCRIBE_KEY;
    if (ablyApiKey) {
      const ably = new Ably.Realtime.Promise(ablyApiKey);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ably.connection.on((stateChange: Ably.Types.ConnectionStateChange) => {
        // console.log(stateChange);
      });

      const channel = ably.channels.get('quickstart');
      channel.subscribe((message: Ably.Types.Message) => {
        if (message.name == 'move' && message.data.gameId == game.id) {
          fetchGame(game.id);
          if (message.data.newTurn) {
            setBackdrop(true);
            setAlerts([{ severity: 'info', message: 'Nu börjar en ny tur!' }]);
            setPlayerHasSubmitted(false);
          }
        }
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [fetchGame, game.id]);

  useEffect(() => {
    let newTiles: TileType[] = [];
    let gameTiles = game.letters.split(',');
    for (let i = newTiles.length; i < 8; i++) {
      let popped = gameTiles.shift();
      if (popped) {
        newTiles.push({ letter: popped, placed: 'hand' });
      }
    }

    const latestTurn = game.turns[0];
    const latestUserMove = latestTurn?.moves.find(
      (move) => move.userSub === currentUser.sub
    );

    if (latestTurn?.turnNumber == game.currentTurn && latestUserMove) {
      setPlayerHasSubmitted(true);

      let currentBoard: TileType[][] = JSON.parse(latestUserMove.playedBoard);

      currentBoard.forEach((row) =>
        row.forEach((cell) => {
          if (cell.placed === 'hand' || cell.placed === 'submitted') {
            const index = newTiles.findIndex((x) => x.letter === cell.letter);
            if (index > -1) {
              newTiles.splice(index, 1);
            }
          }
        })
      );

      setUnplayedBoard(currentBoard);
      setTiles(newTiles);
      setPlacedTiles([]);
      setSelectedTile(emptyTile);
    } else if (
      latestTurn?.turnNumber == game.currentTurn &&
      !latestUserMove &&
      JSON.stringify(unplayedBoard) !== JSON.stringify(defaultBoard())
    ) {
      // gör här ingenting - allt är som det ska redan
    } else if (game.board && game.board.length > 0) {
      let currentBoard: TileType[][] = JSON.parse(game.board);

      setUnplayedBoard(currentBoard);
      setTiles(newTiles);
      setPlacedTiles([]);
      setSelectedTile(emptyTile);
    } else {
      // här hamnar vi på drag 1
      setTiles(newTiles);
      setPlacedTiles([]);
      setSelectedTile(emptyTile);
    }
    // detta borde hanteras bättre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, currentUser]);

  useEffect(() => {
    let newNameList = '';
    game.users.forEach((player) => {
      if (player.userSub !== currentUser.sub) {
        if (newNameList.length > 0) {
          newNameList += ', ';
        }
        newNameList += player.user.name;
      }
    });
    setNameList(newNameList);
  }, [game, currentUser]);

  useEffect(() => {
    let newWordPoints = wordPoints(getPlayedWords(unplayedBoard).join(', '));
    let newBonusPoints = tilePoints(unplayedBoard);

    setCurrentPoints(newWordPoints + newBonusPoints);
    setBonusPoints(newBonusPoints);
  }, [unplayedBoard, placedTiles]);

  const shuffleTileHolder = () => {
    let copiedTiles = shuffleArray(tiles);
    setTiles(copiedTiles);
  };

  const clearBoard = () => {
    let copiedBoard = [...unplayedBoard];
    let copiedTiles = [...tiles];
    copiedBoard.forEach((row, rowIndex) =>
      row.forEach((cell, columnIndex) => {
        if (cell.placed === 'hand' || cell.placed === 'submitted') {
          copiedTiles.push(cell);
          copiedBoard[rowIndex][columnIndex] = emptyTile;
        }
      })
    );
    setUnplayedBoard(copiedBoard);
    setTiles(copiedTiles);
    setPlacedTiles([]);
  };

  const selectTile = (tile: TileType) => {
    setSelectedTile(tile);
  };

  const placeTile = (placedTile: TileType, row: number, column: number) => {
    const copiedBoard = [...unplayedBoard];
    const copiedTiles = [...tiles];
    if (
      placedTile.placed === 'board' ||
      placedTile.placed === 'submitted' ||
      placedTile.placed === 'latest'
    ) {
      // försök att trycka på en redan lagd bricka
      const newShakingTiles = [...shakingTiles];
      newShakingTiles.push(row * 100 + column);
      setShakingTiles(newShakingTiles);

      setTimeout(() => {
        setShakingTiles((shakingTiles) => {
          const newShakingTiles = [...shakingTiles];
          const index = newShakingTiles.findIndex(
            (x) => x == row * 100 + column
          );
          if (index > -1) {
            newShakingTiles.splice(index, 1);
          }
          return newShakingTiles;
        });
      }, 300);
    } else if (placedTile.letter !== emptyTile.letter) {
      // plocka bort en lagd bricka

      copiedTiles.push(placedTile);
      copiedBoard[row][column] = emptyTile;
      setSelectedTile(placedTile);

      setPlacedTiles((placedTiles) => {
        const newPlacedTiles = [...placedTiles];
        const index = newPlacedTiles.findIndex((x) => x == row * 100 + column);
        if (index > -1) {
          newPlacedTiles.splice(index, 1);
        }
        return newPlacedTiles;
      });
    } else if (selectedTile.letter !== emptyTile.letter) {
      // lägg en bricka

      copiedBoard[row][column] = selectedTile;
      const index = copiedTiles.indexOf(selectedTile);
      if (index > -1) {
        copiedTiles.splice(index, 1);
      }
      setSelectedTile(emptyTile);

      const newPlacedTiles = [...placedTiles];
      newPlacedTiles.push(row * 100 + column);
      setPlacedTiles(newPlacedTiles);
    }

    setTiles(copiedTiles);
    setUnplayedBoard(copiedBoard);
  };

  const submitWord = async () => {
    setPlayerHasSubmitted(true);
    const copiedBoard: TileType[][] = JSON.parse(JSON.stringify(unplayedBoard));

    // criteria:
    let tilesPlayed = checkTilesPlayed(copiedBoard); // minst en bricka måste läggas
    let sameDirection = checkSameDirection(copiedBoard); // alla placerade brickor ska vara i samma riktning
    let coherentWord = checkCoherentWord(copiedBoard); // placerade brickor får inte ha ett mellanrum
    let adjacentPlacement = checkAdjacentPlacement(copiedBoard); // brickor får inte placeras som en egen ö

    let newAlerts: AlertType[] = [];
    if (tilesPlayed && sameDirection && coherentWord && adjacentPlacement) {
      newAlerts.push({
        severity: 'info',
        message: `Vänta, draget spelas...`
      });
      addAlerts(newAlerts);

      let playedWords = getPlayedWords(copiedBoard).join(', ');

      const submittedBoard = copiedBoard.map((row) =>
        row.map((cell) => {
          if (cell.placed === 'hand') {
            cell.placed = 'submitted';
          }
          return cell;
        })
      );
      const currentBoard = JSON.stringify(submittedBoard);

      let moveResult = await submitMove(
        game.id,
        game.currentTurn,
        playedWords,
        currentBoard
      );

      if (moveResult.success) {
        setUnplayedBoard(submittedBoard);
        setPlacedTiles([]);
        setAlerts([
          {
            severity: 'success',
            message: `Du lade ${playedWords}!`
          }
        ]);
      } else {
        setAlerts([
          {
            severity: 'error',
            message: moveResult.error.message
              ? moveResult.error.message
              : 'Något gick fel. Försök igen.'
          }
        ]);
        setPlayerHasSubmitted(false);
      }
    } else {
      if (!tilesPlayed) {
        newAlerts.push({
          severity: 'error',
          message: 'Minst en bricka måste läggas.'
        });
      }
      if (!sameDirection) {
        newAlerts.push({
          severity: 'error',
          message: 'Alla brickor måste placeras i samma rad/kolumn.'
        });
      }
      if (!coherentWord) {
        newAlerts.push({
          severity: 'error',
          message: 'Det lagda ordet får inte ha mellanrum i sig.'
        });
      }
      if (!adjacentPlacement) {
        newAlerts.push({
          severity: 'error',
          message:
            'Det lagda ordet måste placeras i anslutning till redan lagda ord.'
        });
      }

      setPlayerHasSubmitted(false);
      addAlerts(newAlerts);
    }
  };

  const passTurn = async () => {
    setPlayerHasSubmitted(true);
    const copiedBoard = [...unplayedBoard];

    let newAlerts: AlertType[] = [];
    newAlerts.push({
      severity: 'info',
      message: `Vänta, draget spelas...`
    });
    addAlerts(newAlerts);

    let moveResult = await submitMove(
      game.id,
      game.currentTurn,
      '',
      JSON.stringify(copiedBoard)
    );
    if (moveResult.success) {
      setUnplayedBoard(copiedBoard);
      setPlacedTiles([]);
      setAlerts([
        {
          severity: 'success',
          message: `Du passade!`
        }
      ]);
    } else {
      setAlerts([
        {
          severity: 'error',
          message: moveResult.error.message
            ? moveResult.error.message
            : 'Något gick fel. Försök igen.'
        }
      ]);
      setPlayerHasSubmitted(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        flexShrink: 0,
        margin: 0
      }}
    >
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column'
        }}
        open={backdrop}
        onClick={handleBackdropClose}
      >
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            severity={alert.severity}
            sx={{
              width: '65vw',
              margin: '3px',
              bgcolor: 'background.paper'
            }}
            variant="outlined"
            onClose={() => {}}
          >
            {alert.message}
          </Alert>
        ))}
      </Backdrop>
      {!playerHasSubmitted && !game.finished && (
        <Head>
          <link rel="icon" href={faviconString('din tur')} key="favicon" />
        </Head>
      )}
      <Head>
        <title>{nameList + ' | Ordbjörn'}</title>
      </Head>
      <BoardGrid size={unplayedBoard.length}>
        {unplayedBoard.map((row, indexRow) =>
          row.map((cell, indexColumn) => (
            <Tile
              key={indexRow * 100 + indexColumn}
              shake={shakingTiles.includes(indexRow * 100 + indexColumn)}
              tile={cell}
              status={cell.placed}
              last={indexRow * 100 + indexColumn == Math.max(...placedTiles)}
              currentPoints={currentPoints}
              onClick={() => placeTile(cell, indexRow, indexColumn)}
            />
          ))
        )}
      </BoardGrid>
      <TileHolder
        tiles={tiles}
        selectedTile={selectedTile}
        selectTile={selectTile}
      />

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', marginBottom: 1 }}
      >
        <Tooltip title="Extrapoäng baserat på ordets längd">
          <LinearProgress
            sx={{ flexGrow: 1, height: '12px', borderRadius: '6px' }}
            variant="determinate"
            value={(bonusPoints / 33) * 100}
          />
        </Tooltip>
        <Typography
          variant="h6"
          component={'p'}
          color="text.secondary"
          style={{ textAlign: 'right' }}
        >
          +{bonusPoints}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        {tiles.length > 0 ? (
          <Button variant="outlined" onClick={() => shuffleTileHolder()}>
            Blanda brickor
          </Button>
        ) : (
          <Button variant="outlined" disabled>
            Blanda brickor
          </Button>
        )}
        {playerHasSubmitted || game.finished ? (
          <>
            <Button variant="outlined" disabled>
              Rensa
            </Button>
            <Button variant="outlined" disabled>
              Passa
            </Button>
            <Button variant="contained" disabled>
              Spela ordet
            </Button>
          </>
        ) : (
          <>
            {placedTiles.length > 0 ? (
              <Button variant="outlined" onClick={() => clearBoard()}>
                Rensa
              </Button>
            ) : (
              <Button variant="outlined" disabled>
                Rensa
              </Button>
            )}
            <Button variant="outlined" onClick={() => passTurn()}>
              Passa
            </Button>
            <Button variant="contained" onClick={() => submitWord()}>
              Spela ordet
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
};

type BoardGridProps = {
  size: number;
};

const BoardGrid = styled('div')<BoardGridProps>((props) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.size}, 1fr)`,
  gridTemplateRows: `repeat(${props.size}, 1fr)`,
  gap: props.theme.spacing(0.25),
  justifyItems: 'stretch',
  width: '100%',
  maxWidth:
    'calc(100vh - 64px - 8px - 8px - 68px - 8px - 28px - 8px - 33px - 8px)',
  // 100vh - navbar (64) - margin (8) - brädet - margin (8) - tile holder (68) - margin (8) - progress bar (28) - margin (8) -  button (33) - margin (8)
  margin: 'auto',
  aspectRatio: '1/1'
}));
