import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import env from './env';
import router from './routes/index';
import notFound from './middleware/notFound';
import resolveChain from './middleware/resolveChain';
import errorHandler from './middleware/errorHandler';
import resolveNetwork from './middleware/resolveNetwork';
import logServerActivity from './middleware/logServerActivity';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    exposedHeaders: ['X-Chain', 'X-Network', 'X-Stellar-Network'],
  }),
);

app.use(resolveChain);

app.use(resolveNetwork);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(logServerActivity);
app.use(router);
app.use(notFound);
app.use(errorHandler);

export default app;
