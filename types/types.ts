import { AlertColor } from '@mui/material';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export interface Tile {
  letter: string;
  placed: string;
}

export type Alert = {
  severity: AlertColor;
  message: string;
};

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: Error;
}

export type ResponseType<T> = SuccessResponse<T> | ErrorResponse;

export type StatsData = {
  day: string;
  unique_users_with_turns: number;
  total_moves: number;
}[];

export type GameWithEverything = Prisma.GameGetPayload<{
  include: {
    users: {
      include: {
        user: true;
      };
    };
    invitations: true;
    turns: {
      include: {
        moves: true;
      };
    };
  };
}>;

export type GameListData = Prisma.UsersOnGamesGetPayload<{
  include: {
    game: {
      include: {
        users: {
          orderBy: {
            user: {
              name: 'asc';
            };
          };
          include: {
            user: true;
          };
        };

        invitations: true;
      };
    };
  };
}>;

export type UserListData = Prisma.UserGetPayload<{
  select: {
    name: true;
    picture: true;
    sub: true;
  };
}>;

export const UserFromAuth0InputSchema = z.object({
  sub: z.string().min(3),
  name: z.string(),
  picture: z.string().url(),
  email: z.string().email()
});

export type UserFromAuth0Input = z.infer<typeof UserFromAuth0InputSchema>;

export type WrongTurnData = Prisma.GameGetPayload<{
  include: {
    users: {
      include: {
        user: true;
      };
    };
    turns: {
      include: {
        moves: true;
      };
    };
  };
}>;
