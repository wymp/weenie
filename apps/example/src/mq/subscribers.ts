import { MessageHandler } from "@wymp/weenie-framework";
import { Deps } from "../deps/prod";
import { MSGS, MSG_KEYS } from "../types";

/** Log all created messages for debugging (NOT A REAL PRODUCTION THING - JUST AN EXAMPLE) */
const logAllMessages = (): MessageHandler<MSGS[keyof MSGS]> => async (msg, _, log) => {
  log.debug(`Received message: ${JSON.stringify(msg)}`);
  return true;
}

/** Log all created users (NOT A PRODUCTION THING - JUST AN EXAMPLE) */
const logCreatedUsers = (): MessageHandler<MSGS[MSG_KEYS.EXAMPLE_USERS_CREATED]> => async (msg, _, log) => {
  log.notice(`User created: ${JSON.stringify({
    id: msg.data.id,
    name: msg.data.name,
    email: msg.data.email,
    isAdmin: msg.data.isAdmin,
  })}`);
  return true;
}

/** Save statistics about requests */
const saveRequestStat = (deps: Pick<Deps, 'db'>): MessageHandler<MSGS[MSG_KEYS.EXAMPLE_STATS_REQUESTS]> => async (msg) => {
  // Save the stat in the database
  await deps.db.createRequestStats(msg.data);
  return true;
}

/** All subscription handler functions */
export const Subscribers = {
  logAllMessages,
  logCreatedUsers,
  saveRequestStat,
}
export type Subscribers = typeof Subscribers;
