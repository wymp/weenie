import { SimpleSqlDbInterface } from '@wymp/ts-simple-interfaces';
import { PartialSelect, RequestStat, Session, User } from '../../types';
import { HttpError } from '@wymp/http-errors';
import { randomUUID } from 'crypto';

/** Weenie function for attaching the db dependency */
export const db = (deps: { mysql: SimpleSqlDbInterface }) => ({ db: new Db(deps) });

/** Db abstraction class */
class Db {
  protected mysql: SimpleSqlDbInterface;
  public constructor(deps: { mysql: SimpleSqlDbInterface }) {
    this.mysql = deps.mysql;
  }

  public async getAllUsers(): Promise<Array<User>> {
    const { rows } = await this.mysql.query<User>('SELECT * FROM users');
    return rows;
  }

  public async getUserById(id: string): Promise<User> {
    const { rows } = await this.mysql.query<User>('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];
    if (!user) {
      throw new HttpError(404, `No user found with id ${id}`);
    }
    return user;
  }

  public async getUserByEmail(email: string): Promise<User> {
    const { rows } = await this.mysql.query<User>('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      throw new HttpError(404, `No user found with the given email`);
    }
    return user;
  }

  public async createUser(user: PartialSelect<User, 'id'>): Promise<User> {
    if (!user.id) {
      user.id = randomUUID();
    }
    await this.mysql.query('INSERT INTO users (id, name, email, passwordBcrypt, isAdmin) VALUES (?, ?, ?, ?, ?)', [
      user.id,
      user.name,
      user.email,
      user.passwordBcrypt,
      user.isAdmin,
    ]);
    const { rows } = await this.mysql.query<User>('SELECT * FROM users WHERE id = ?', [user.id]);
    return rows[0]!;
  }

  public async createRequestStats(stat: PartialSelect<RequestStat, 'id' | 'timestampMs'>): Promise<RequestStat> {
    if (!stat.id) stat.id = randomUUID();
    if (!stat.timestampMs) stat.timestampMs = Date.now();
    await this.mysql.query(
      'INSERT INTO `request-stats` (id, method, path, authd, responseStatus, timestampMs) VALUES (?, ?, ?, ?, ?, ?)',
      [stat.id, stat.method, stat.path, stat.authd, stat.responseStatus, stat.timestampMs],
    );
    const { rows } = await this.mysql.query<RequestStat>('SELECT * FROM `request-stats` WHERE id = ?', [stat.id]);
    return rows[0]!;
  }

  public async getRequestStats(): Promise<Array<RequestStat>> {
    const { rows } = await this.mysql.query<RequestStat>('SELECT * FROM `request-stats`');
    return rows;
  }

  public async createSession(userId: string): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      // This would normally be some kind of JWT or something but for this example we're keeping it simple
      token: randomUUID(),
      userId,
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
      invalidatedAtMs: null,
    };
    await this.mysql.query(
      'INSERT INTO sessions (id, token, userId, createdAtMs, expiresAtMs, invalidatedAtMs) VALUES (?, ?, ?, ?, ?, ?)',
      [session.id, session.token, session.userId, session.createdAtMs, session.expiresAtMs, session.invalidatedAtMs],
    );
    return session;
  }

  public async getSessionByToken(token: string): Promise<Session | undefined> {
    const { rows } = await this.mysql.query<Session>('SELECT * FROM sessions WHERE token = ?', [token]);
    return rows[0];
  }

  public async invalidateSession(by: { type: 'id' | 'token'; value: string }): Promise<void> {
    const type = by.type === 'id' ? 'id' : 'token';
    await this.mysql.query('UPDATE sessions SET invalidatedAtMs = ? WHERE ' + type + ' = ?', [Date.now(), by.value]);
  }
}
