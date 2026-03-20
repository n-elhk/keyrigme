// import { CATEGORIES_VALUES, QuestionCategories } from '@keyrigme/keyrigme-models';
import { z } from 'zod';

// type CategoriesEnum = z.infer<typeof QuestionCategories>; // string

export const updateRoomConfigSchema = z.object({
    noOfPlayers: z.number(),
    noOfRounds: z.number(),
    roomId: z.string(),
    categories: z.array(z.string()),
});

export type UpdateRoomConfigDto = z.infer<typeof updateRoomConfigSchema>;

