import React, { useEffect, useState } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
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

export const UsersByPeriod = () => {
  let [stats, setStats] = useState<StatsData>();
  let [statsData, setStatsData] = useState<any>();
  let [period, setPeriod] = useState<string>('daily');

  const options = {
    animation: false,
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

  function groupDataByWeek(data: StatsData): StatsData {
    const weeklyData: StatsData = [];
    let currentWeek: {
      day: string;
      unique_users_with_turns: number;
      total_moves: number;
    } | null = null;

    for (const stat of data) {
      const statDate = new Date(stat.day);
      const weekStartDate = new Date(
        statDate.getFullYear(),
        statDate.getMonth(),
        statDate.getDate() - statDate.getDay()
      );

      if (
        currentWeek === null ||
        weekStartDate.toISOString() !== currentWeek.day
      ) {
        // New week
        if (currentWeek !== null) {
          weeklyData.push(currentWeek);
        }

        currentWeek = {
          day: weekStartDate.toISOString(),
          unique_users_with_turns: stat.unique_users_with_turns,
          total_moves: stat.total_moves
        };
      } else {
        // Accumulate data for the current week
        currentWeek.unique_users_with_turns += stat.unique_users_with_turns;
        currentWeek.total_moves += stat.total_moves;
      }
    }

    // Add the last week
    if (currentWeek !== null) {
      weeklyData.push(currentWeek);
    }

    return weeklyData;
  }

  function groupDataByMonth(data: StatsData): StatsData {
    const monthlyData: StatsData = [];
    let currentMonth: {
      day: string;
      unique_users_with_turns: number;
      total_moves: number;
    } | null = null;

    for (const stat of data) {
      const statDate = new Date(stat.day);
      const monthStartDate = new Date(
        statDate.getFullYear(),
        statDate.getMonth(),
        1
      );

      if (
        currentMonth === null ||
        monthStartDate.toISOString() !== currentMonth.day
      ) {
        // New month
        if (currentMonth !== null) {
          monthlyData.push(currentMonth);
        }

        currentMonth = {
          day: monthStartDate.toISOString(),
          unique_users_with_turns: stat.unique_users_with_turns,
          total_moves: stat.total_moves
        };
      } else {
        // Accumulate data for the current month
        currentMonth.unique_users_with_turns += stat.unique_users_with_turns;
        currentMonth.total_moves += stat.total_moves;
      }
    }

    // Add the last month
    if (currentMonth !== null) {
      monthlyData.push(currentMonth);
    }

    return monthlyData;
  }

  useEffect(() => {
    if (stats) {
      let chartStats = stats;
      if (period === 'weekly') {
        chartStats = groupDataByWeek(stats);
      }
      if (period === 'monthly') {
        chartStats = groupDataByMonth(stats);
      }
      let newStatsData = {
        labels: chartStats.map((stat) =>
          new Date(stat.day).toLocaleDateString()
        ),
        datasets: [
          {
            label: 'Antal användare som gjort minst ett drag',
            data: chartStats.map((stat) => stat.unique_users_with_turns),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgb(255, 99, 132)',
            yAxisID: 'y',
            tension: 0.2,
            pointStyle: false
          },
          {
            label: 'Antal drag',
            data: chartStats.map((stat) => stat.total_moves),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgb(53, 162, 235)',
            yAxisID: 'y1',
            tension: 0.2,
            pointStyle: false
          }
        ]
      };

      setStatsData(newStatsData);
    }
  }, [stats, period]);

  const handlePeriod = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: string
  ) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  if (!stats || !statsData) {
    return <Loading />;
  }

  return (
    <>
      <ToggleButtonGroup
        value={period}
        exclusive
        onChange={handlePeriod}
        aria-label="chart periods"
        sx={{ my: 1 }}
      >
        <ToggleButton value="daily" aria-label="left aligned">
          Per dag
        </ToggleButton>
        <ToggleButton value="weekly" aria-label="centered">
          Per vecka
        </ToggleButton>
        <ToggleButton value="monthly" aria-label="right aligned">
          Per månad
        </ToggleButton>
      </ToggleButtonGroup>
      <Line options={options} data={statsData} />
    </>
  );
};
