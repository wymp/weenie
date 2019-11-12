import {
  SimpleLoggerInterface,
  SimpleHttpClientInterface,
  SimpleSqlDbInterface,
  SimplePubSubInterface,
} from "ts-simple-interfaces";
import * as rt from "runtypes";

/**
 * A webservice should specify one or more ports and optionally hosts
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
 * for these services to define their own type of ServiceResources.
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
  publishingDomains: rt.Array(rt.String),
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
 * Defines a logfile path and a level.
 */
export const loggerConfigValidator = rt.Record({
  logLevel: rt.String,
  logFilePath: rt.String,
});
export type LoggerConfig = rt.Static<typeof loggerConfigValidator>;

/**
 * Brings all the config validators together into a cohesive collection
 */
export const frameworkConfigValidator = rt.Record({
  envType: rt.String,
  envName: rt.String,
  serviceName: rt.String,
  initialJobWait: optional(rt.Number),
  maxJobWait: optional(rt.Number),
  initializationTimeout: rt.Number,
  logger: loggerConfigValidator,
  amqp: optional(overrideable(mqConnectionConfigValidator)),
  db: optional(overrideable(databaseConfigValidator)),
  webService: optional(overrideable(webServiceConfigValidator)),
});
export type FrameworkConfig = rt.Static<typeof frameworkConfigValidator>;

/**
 * Brings all resources together into one "bag"
 */
export interface FrameworkResources {
  readonly config: FrameworkConfig;
  readonly logger: SimpleLoggerInterface;
  readonly db: SimpleSqlDbInterface | null;
  readonly amqp: SimplePubSubInterface | null;
  readonly api: SimpleHttpClientInterface | null;
}

export interface MQEventHandler<Resources = FrameworkResources> {
  domain: string;
  queueName: string;
  bindings: Array<{ action: string; resource: string }>;
  handler: (ev: unknown, resources: Resources) => Promise<boolean>;
}

export interface ServiceResourceFactory {
  logger: (opts: unknown) => SimpleLoggerInterface;
  /*
  api: (
    envType: string, // Usually 'dev' or 'staging' or 'prod' or 'uat', etc.
    envName: string, // Something more specific, like 'uat1', 'uat2', etc.
    config: OfapiConfig,
    logger: SimpleLoggerInterface
  ) => SimpleHttpClientInterface;
  db: (config: DatabaseConfig) => SimpleDbInterface;
  amqpCnx: (config: MQConnectionConfig) => Promise<AmqpCnx>;
   */
}

export interface MQEventHandlersCollection<DepT = null> {
  [key: string]: MQEventHandler<DepT>;
}

export interface Cronjob<Resources = FrameworkResources> {
  name: string;
  intervalMS: number;
  handler: (r: Resources) => Promise<boolean>;
}

export type CronjobsCollection<Resources = FrameworkResources> = Array<Cronjob<Resources>>;

export type Ander<BaseResources = {}> = BaseResources & {
  and: <I extends {}>(next: (r?: BaseResources) => I) => Ander<BaseResources & I>;
}

// Type utilities


// Make arguments optional
function optional(t: rt.Runtype): rt.Runtype {
  return rt.Union(t, rt.Undefined);
}

// Make the argument accept null as an override
function overrideable(t: rt.Runtype): rt.Runtype {
  return rt.Union(t, rt.Null);
}

