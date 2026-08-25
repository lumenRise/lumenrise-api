import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';

import router from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(router);
app.use(notFound);
app.use(errorHandler);

export default app;
