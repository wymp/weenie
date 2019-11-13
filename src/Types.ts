import * as rt from "runtypes";

/**
 * CONFIG STRUCTURE DEFINITIONS
 *
 * The following definitions are more convenience than mandate. All frameworks work by establishing
 * certain conventions and enforcing certain assumptions. Since this is a micro-framework, it
 * doesn't go so far as to "enforce" the conventions laid out here. However, following them is
 * expected to bring lots of benefit and very little cost.
 */

/**
 * A webservice should specify one or more listening ports with optional hosts (may be the same
 * port on multiple hosts)
 */
const Port = rt.Number;
const Host = rt.String;
export const webServiceConfigValidator = rt.Record({
  listeners: rt.Array(rt.Tuple(Port, optional(Host)))
});
export type WebServiceConfig = rt.Static<typeof webServiceConfigValidator>;

/**
 * In this model, there is assumed to be one primary API service through which all APIs are
 * accessed. This is not necessarily realistic for some services, and it may be more appropriate
 * for these services to define their own type of API Config.
 *
 * Under this scheme, however, it is expected that the framework make assumptions about what the
 * final base url is based on the environment (`envName`) and one or more hard-coded domains.
 *
 * The `overrideUrl` parameter is provided to offer programmers an easy way to point services
 * at an arbitrary URL during development.
 */
export const apiConfigValidator = rt.Record({
  key: rt.String,
  secret: rt.String,
  overrideUrl: overrideable(rt.String),
});
export type ApiConfig = rt.Static<typeof apiConfigValidator>;

/**
 * This is mostly just a runtime validation of AMQP configs
 */
export const mqConnectionConfigValidator = rt.Record({
  protocol: rt.Literal("amqp"),
  hostname: rt.String,
  port: rt.Number,
  username: rt.String,
  password: rt.String,
  locale: rt.String,
  vhost: rt.String,
  heartbeat: rt.Number,
});
export type MQConnectionConfig = rt.Static<typeof mqConnectionConfigValidator>;

/**
 * Mostly just a runtime validation of MySQL configs
 */
export const databaseConfigValidator = rt.Record({
  host: rt.Union(rt.String, rt.Undefined),
  port: rt.Union(rt.Number, rt.Undefined),
  socketPath: rt.Union(rt.String, rt.Undefined),
  user: rt.String,
  password: rt.String,
  database: rt.String,
});
export type DatabaseConfig = rt.Static<typeof databaseConfigValidator>;

/**
 * Defines a logfile path and a level at which to write logs
 */
export const loggerConfigValidator = rt.Record({
  logLevel: rt.Literal("debug")
    .Or(rt.Literal("info"))
    .Or(rt.Literal("notice"))
    .Or(rt.Literal("warning"))
    .Or(rt.Literal("error"))
    .Or(rt.Literal("alert"))
    .Or(rt.Literal("critical"))
    .Or(rt.Literal("emergency")),

  // If this is null, then logs are only written to stdout
  logFilePath: rt.String.Or(rt.Null),
});
export type LoggerConfig = rt.Static<typeof loggerConfigValidator>;

/**
 * Brings all the config validators together into a cohesive collection
 */
export const frameworkConfigValidator = rt.Record({
  /** Defines an environment type, e.g., 'dev', 'uat', 'qa', 'staging', 'prod' */
  envType: rt.String,

  /** Defines a specific environment name, e.g., 'dev', 'demo1', 'demo2', 'staging', 'prod' */
  envName: rt.String,

  /** The service name */
  serviceName: rt.String,
  /**
   * This is the intitial time in ms that we should wait before retrying a failed job.
   *
   * This is intended to be used by an exponential backoff system, where the system takes this
   * parameter and doubles it on each failed attempt.
   */
  initialJobWaitMs: optional(rt.Number),

  /** Maximum time to wait in ms before the application should stop retrying a failed job */
  maxJobWaitMs: optional(rt.Number),

  /** Maximum time to wait in ms for the application to start before we should throw an error */
  initializationTimeoutMs: rt.Number,

  /** Logger configuration */
  logger: loggerConfigValidator,

  /** mq configuration */
  amqp: optional(overrideable(mqConnectionConfigValidator)),

  /** db configuration */
  db: optional(overrideable(databaseConfigValidator)),

  /** webservice configuration */
  webService: optional(overrideable(webServiceConfigValidator)),
});
export type FrameworkConfig = rt.Static<typeof frameworkConfigValidator>;


/**
 * MESSAGES
 */
export interface MQEventHandler<Resources> {
  name: string;
  bindings: Array<string>;
  handler: (ev: unknown, resources: Resources) => Promise<boolean>;
}


/**
 * CRON
 */

/**
 * The following define a "Clockspec". This follows the format laid out in
 * http://man7.org/linux/man-pages/man5/crontab.5.html, with the addition of the 'seconds'
 * field at the beginning.
 */
type Second = string;
type Minute = string;
type Hour = string;
type DayOfMonth = string;
type Month = string;
type DayOfWeek = string;
export type Clockspec = [ Second, Minute, Hour, DayOfMonth, Month, DayOfWeek ];

/**
 * Defines an interval-based cronjob. This will run every time the given interval(s) are met.
 */
export interface IntervalCronjob<Resources> {
  name: string;
  type: "interval";
  intervalMS: number | Array<number>;
  handler: (r: Resources) => Promise<boolean>;
}
export interface ClockCronjob<Resources> {
  name: string;
  type: "clock";
  clockspec: Clockspec | Array<Clockspec>;
  handler: (r: Resources) => Promise<boolean>;
}
export type Cronjob<Resources> = IntervalCronjob<Resources> | ClockCronjob<Resources>;


/**
 * MISCELLANEOUS
 *
 * Miscellaneous utilities to make our code cleaner
 */

// Make arguments optional
function optional(t: rt.Runtype): rt.Runtype {
  return rt.Union(t, rt.Undefined);
}

// Make the argument accept null as an override
function overrideable(t: rt.Runtype): rt.Runtype {
  return rt.Union(t, rt.Null);
}

