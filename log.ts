import { pino } from "pino";
import "pino-pretty";

export const log = pino({
  transport: {
    target: "pino-pretty",
  },
});

export type Logger = pino.Logger;
