import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import env from './env';
import router from './routes/index';
import notFound from './middleware/notFound';
import errorHandler from './middleware/errorHandler';
import resolveNetwork from './middleware/resolveNetwork';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());

app.use(cors({ origin: [env.CLIENT_ORIGIN, 'http://localhost:3000'], credentials: true }));

app.use(resolveNetwork);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(router);
app.use(notFound);
app.use(errorHandler);

export default app;
