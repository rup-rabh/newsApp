// src/index.ts
import { Hono } from 'hono';
import { newsRouter } from './routes/news';
import { cors } from "hono/cors";

type Env = {
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// Register routesconsole.log('Server started at /');
console.log('Registered routes at /news');
app.route('/news', newsRouter);

export default app;
