import * as bcrypt from 'bcryptjs';
import { Deps } from '../deps/prod';
import { PartialSelect, Session, User } from '../types';
import { HttpError } from '@wymp/http-errors';

/**
 * Library function to create a user and (optionally) a session
 *
 * WARNING: PRODUCTION APPS SHOULD HAVE MORE COMPLEX REGISTRATION AND SESSION MANAGEMENT THAN THIS
 */
export function createUser(
  deps: Pick<Deps, 'db'>,
  userData: Omit<PartialSelect<User, 'id'>, 'passwordBcrypt'>,
  password: string,
  createSession?: false,
): Promise<User>;
export function createUser(
  deps: Pick<Deps, 'db'>,
  userData: Omit<PartialSelect<User, 'id'>, 'passwordBcrypt'>,
  password: string,
  createSession: true,
): Promise<{ user: User; session: Session }>;
export async function createUser(
  deps: Pick<Deps, 'db'>,
  userData: Omit<PartialSelect<User, 'id'>, 'passwordBcrypt'>,
  password: string,
  createSession?: boolean,
): Promise<User | { user: User; session: Session }> {
  // Hash the password
  const passwordBcrypt = await new Promise<string>((res, rej) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        rej(err);
      } else {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            rej(err);
          } else {
            res(hash);
          }
        });
      }
    });
  });

  // Create the user
  const user = await deps.db.createUser({ ...userData, passwordBcrypt });

  // If we're not creating a session, just return the user
  if (!createSession) {
    return user;
  }

  // Create a session for the user
  const session = await deps.db.createSession(user.id);
  return {
    user,
    session,
  };
}

/** Log a user in with an email and password, returning the user and a session */
export const login = async (
  deps: Pick<Deps, 'db'>,
  email: string,
  password: string,
): Promise<{ user: User; session: Session }> => {
  let user: User;
  try {
    user = await deps.db.getUserByEmail(email);
  } catch (_e) {
    const e = HttpError.from(_e);
    if (e.status === 404) {
      throw new HttpError(401, 'Invalid username or password');
    }
    throw e;
  }

  const result = await new Promise<boolean>((res, rej) => {
    bcrypt.compare(password, user.passwordBcrypt, (err, result) => {
      if (err) {
        rej(err);
      } else {
        res(result);
      }
    });
  });
  if (!result) {
    throw new HttpError(401, 'Invalid username or password');
  }

  const session = await deps.db.createSession(user.id);
  return {
    user,
    session,
  };
};

/** Log a user out */
export const logout = async (deps: Pick<Deps, 'db'>, by: { type: 'id' | 'token'; value: string }) => {
  return await deps.db.invalidateSession(by);
};
