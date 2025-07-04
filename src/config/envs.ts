import 'dotenv/config';
import * as Joi from 'joi';

interface EnvVars {
  PORT: number;
  JWT_SECRET: string;
  NATS_SERVERS: string[];
}

const envSchema = Joi.object({
  PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().required(),
  NATS_SERVERS: Joi.array().items(Joi.string()).required(),
}).unknown(true);

const { error, value } = envSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});

if (error) {
  throw new Error(`Environment variable validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  jwtSecret: envVars.JWT_SECRET,
  natsServers: envVars.NATS_SERVERS,
};
