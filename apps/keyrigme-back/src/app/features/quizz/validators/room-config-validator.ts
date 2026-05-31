import { z } from 'zod';

export const updateRoomConfigSchema = z.object({
  noOfPlayers: z.number().int().min(2),
  noOfRounds: z.number().int().min(1),
  roomId: z.string().min(1),
  categories: z.array(z.string()),
});
export type UpdateRoomConfigDto = z.infer<typeof updateRoomConfigSchema>;

export const createRoomSchema = z.object({
  username: z.string().min(1),
  avatar: z.string().min(1),
});

export type CreateRoomDto = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  code: z.string().min(1),
  username: z.string().min(1),
  avatar: z.string().min(1),
});
export type JoinRoomDto = z.infer<typeof joinRoomSchema>;

export const roomIdSchema = z.string().min(1);
export type RoomIdDto = z.infer<typeof roomIdSchema>;

export const playerAnswerSchema = z.object({
  roomId: z.string().min(1),
  questionId: z.string().min(1),
  response: z.string(),
});

export type PlayerAnswerDto = z.infer<typeof playerAnswerSchema>;

export const setUserPointsSchema = z.object({
  roomId: z.string().min(1),
  answers: z.record(
    z.string(),
    z.record(z.string(), z.object({ response: z.string(), point: z.number() })),
  ),
});

export type SetUserPointsDto = z.infer<typeof setUserPointsSchema>;

export const changeIndexAnswersSchema = z.object({
  roomId: z.string().min(1),
  index: z.number().int().min(0),
});

export type ChangeIndexAnswersDto = z.infer<typeof changeIndexAnswersSchema>;

export const removePlayerSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});

export type RemovePlayerDto = z.infer<typeof removePlayerSchema>;
