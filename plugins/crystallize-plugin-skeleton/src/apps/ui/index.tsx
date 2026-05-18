import { Hono } from 'hono';
import { DecodedPayloadAppContext } from '@/contracts/app-context';
import { payloadDecrypter } from '@/core/middlewares/payload-decrypter';
import { renderer } from './core/renderer';
import { Home } from './pages/home';
import { Widget } from './pages/widget';

export const createUIApp = () => {
    const app = new Hono<DecodedPayloadAppContext>();
    app.use(renderer);
    app.on(['GET', 'POST'], '/', (c) => c.render(<Home />));
    app.post('/widget', payloadDecrypter, (c) => c.render(<Widget />));
    return app;
};
