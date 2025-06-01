import express, { NextFunction, Response,Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import Redis from 'ioredis';
import proxy from 'express-http-proxy';
import { RedisReply, RedisStore } from 'rate-limit-redis';
import dotenv from 'dotenv';
import {logger} from '@/utils/logger';
import {errorHandler} from '@/middleware/errorhandler';
import { validateToken } from './middleware/authvalidator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//connecting to redis client
const redis_url = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new Redis(redis_url);

//global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


// Rate limiting
const ratelimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
 store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
})
});

app.use(ratelimitOptions);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to "${req.url}" from IP: ${req.ip}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the API Gateway',
    status: 'OK',
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'API Gateway is healthy',
    status: 'OK',
  });
});



// Common proxy options
const proxyOptions = {
  proxyReqPathResolver: (req:Request) => req.originalUrl.replace(/^\/v1/, "/api"),
  proxyErrorHandler: (err: { message: any; }, res:Response, next:NextFunction) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: 'Internal server error',
      error: err.message,
      details: err,
    });
  },
};

const IDENTITY_SERVICE_URL= process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';
// Identity service
app.use(
  '/v1/auth',
  proxy(IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      //@ts-ignore
      proxyReqOpts.headers['Content-Type'] = 'application/json';
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(`Response from Identity service: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  })
);

const rideservice= process.env.RIDE_SERVICE_URL || 'http://localhost:3002';

app.use(
  //@ts-ignore
  "/v1/rides",validateToken,
  proxy(rideservice, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      //@ts-ignore
      proxyReqOpts.headers["Content-Type"] = "application/json";
      //@ts-ignore
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      //@ts-ignore
      proxyReqOpts.headers["x-user-role"] = srcReq.user.role;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from ride service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);


app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Proxying Identity service at ${IDENTITY_SERVICE_URL}`);
});


