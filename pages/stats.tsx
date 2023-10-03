import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Menu } from 'components/Menu';
import { useUser, withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import { Footer } from 'components/Footer';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { Typography } from '@mui/material';
import { faviconString } from 'services/helpers';
import Head from 'next/head';
import { Loading } from 'components/Loading';
import { ResponseType, StatsData } from 'types/types';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

const getStats = async (): Promise<ResponseType<StatsData>> => {
  const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8'
  };
  const url = '/api/stats/';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const StatsPage: NextPage<{}> = () => {
  let [stats, setStats] = useState<StatsData>();
  let [statsData, setStatsData] = useState<any>();

  const { user, isLoading } = useUser(); // härifrån finns också error att ta ut

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false
    },
    stacked: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left'
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right'
      }
    }
  } as const;

  const fetchStats = async () => {
    let newStats = await getStats();

    if (newStats.success && newStats.data) {
      setStats(newStats.data);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (stats) {
      let newStatsData = {
        labels: stats.map((stat) => new Date(stat.day).toLocaleDateString()),
        datasets: [
          {
            label: 'Antal användare som gjort minst ett drag',
            data: stats.map((stat) => stat.unique_users_with_turns),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgb(255, 99, 132)',
            yAxisID: 'y',
            tension: 0.5,
            pointStyle: false
          },
          {
            label: 'Antal drag',
            data: stats.map((stat) => stat.total_moves),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgb(53, 162, 235)',
            yAxisID: 'y1',
            tension: 0.5,
            pointStyle: false
          }
        ]
      };

      setStatsData(newStatsData);
    }
  }, [stats]);

  if (isLoading || !user || !stats || !statsData) {
    return <Loading />;
  }

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
        <title>Statistik | Ordbjörn</title>
        <link rel="icon" href={faviconString()} key="favicon" />
      </Head>
      <Menu />
      <Container maxWidth="lg" sx={{ flexGrow: 1 }}>
        <Typography variant="h4" sx={{}}>
          Statistik
        </Typography>
        <Line options={options} data={statsData} />
      </Container>
      <Footer />
    </Box>
  );
};

export default withPageAuthRequired(StatsPage);
