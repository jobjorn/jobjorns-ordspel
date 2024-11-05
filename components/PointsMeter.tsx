import { LinearProgress, Stack, Tooltip, Box, styled } from '@mui/material';
import { bonusPointsSums } from 'data/defaults';
import React from 'react';

export const PointsMeter = ({ progress }: { progress: number }) => {
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', marginBottom: 1, padding: '0 2em' }}
      >
        <Box style={{ flexGrow: 1 }}>
          <Box style={{ width: '100%', marginTop: '-17px' }}>
            <MeterGridCell count={1}>
              &nbsp;
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={2}>
              +{bonusPointsSums[1]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={3}>
              +{bonusPointsSums[2]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={4}>
              +{bonusPointsSums[3]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={5}>
              +{bonusPointsSums[4]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={6}>
              +{bonusPointsSums[5]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={7}>
              +{bonusPointsSums[6]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
            <MeterGridCell count={8}>
              +{bonusPointsSums[7]}
              <br />
              <span style={{ color: '#121212' }}>|</span>
            </MeterGridCell>
          </Box>

          <Tooltip title="Extrapoäng baserat på ordets längd">
            <LinearProgress
              sx={{
                flexGrow: 1,
                height: '12px',
                borderRadius: '6px'
              }}
              variant="determinate"
              value={(progress / 8) * 100}
            />
          </Tooltip>
        </Box>
      </Stack>
    </>
  );
};

/*
const MeterGrid = styled('div')(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(8, 1fr)`,
  justifyItems: 'stretch',
  width: '100%',
  height: '20px'
}));
*/

type MeterGridCellProps = {
  count: number;
};
const MeterGridCell = styled('div')<MeterGridCellProps>((props) => ({
  display: 'inline-block',
  width: '40px',
  height: '20px',
  border: '0px solid lime',
  fontWeight: props.theme.typography.h6.fontWeight,
  fontSize: props.theme.typography.h6.fontSize,
  color: props.theme.palette.text.secondary,
  textAlign: 'center',
  position: 'relative',
  lineHeight: '1',
  left: `calc((100% / 8 * ${props.count}) - 20px - ((${props.count} - 1) * 40px))`,
  top: '1em',
  zIndex: 100
}));

/*
=(E9*50)-10-(E9-1)*20
*/
