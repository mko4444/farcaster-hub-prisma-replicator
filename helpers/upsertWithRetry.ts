import { MAX_PRISMA_RETRY } from "../constants";

export async function upsertWithRetry(model, where, create, update, retryCount = MAX_PRISMA_RETRY) {
  for (let i = 0; i < retryCount; i++) {
    try {
      await model.upsert({
        where,
        create,
        update,
      });
      break;
    } catch (error) {
      if ((error.code !== "P2025" && error.code !== "P2002") || i === retryCount - 1) {
        throw error;
      }
    }
  }
}
