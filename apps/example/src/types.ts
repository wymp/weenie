// You might normally make this a shared library, but for this example we're just in-housing it

//
// Convenience/Utility/Misc Types
//

/** Possible application environments */
export enum ENVS {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  STAGING = 'staging',
}

/**
 * This allows us to make specific fields optional; Usually used for incoming data with default values
 */
export type PartialSelect<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

//
// Data Model Types
//

/** A user object */
export type User = {
  id: string;
  name: string;
  email: string;
  passwordBcrypt: string;
  isAdmin: boolean;
}

/** A RequestStat object */
export type RequestStat = {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  authd: boolean | null;
  responseStatus: number;
  timestampMs: number;
}

/** A user login session */
export type Session = {
  id: string;
  token: string;
  userId: string;
  createdAtMs: number;
  expiresAtMs: number;
  invalidatedAtMs: number | null;
}

//
// MQ Types
//

export enum MSG_KEYS {
  EXAMPLE_STATS_REQUESTS = 'example.stats.requests',
  EXAMPLE_USERS_CREATED = 'example.users.created',
}

/** An index of message types for this domain */
export type MSGS = {
  [MSG_KEYS.EXAMPLE_STATS_REQUESTS]: {
    key: MSG_KEYS.EXAMPLE_STATS_REQUESTS;
    data: Omit<RequestStat, 'id'>;
  };
  [MSG_KEYS.EXAMPLE_USERS_CREATED]: {
    key: MSG_KEYS.EXAMPLE_USERS_CREATED;
    data: User;
  };
}

/** All types of messages that the `example` domain might emit */
export type ExampleDomainMessages = MSGS[keyof MSGS];

/** The combination of all messages from all domains */
export type AllDomainMessages = ExampleDomainMessages;