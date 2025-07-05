self.addEventListener('install', ev => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(clients.claim()));
self.addEventListener('fetch', ev => ev.respondWith(
    /(?:api|sql)\//.test(new URL(ev.request.url).pathname) ? 
        Routes.DB(ev.request.url) : Routes.headers(ev.request)
));

self.onmessage = ev => workerD = Object.assign(ev.ports[0], {
    query: url => new Promise(res => {
        workerD.postMessage(url);
        workerD.addEventListener('message', ev => res(ev.data), {once: true});
    }),
    onmessage: ev => {},
});

let workerD;

const Routes = {
    DB: url => workerD.query(url)
        .then(data => typeof data == 'number' ? new Response('', { status: data }) : 
            Function.prototype.call.bind(Object.prototype.toString)(data) == '[object Error]' ?
                new Response(data, { status: 500 }) : new Response(JSON.stringify(data))
        ).catch(er => console.error(er)),

    headers: req => {
        if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return;
        return fetch(req).then(res => {
            if (res.status === 0) return res;
            const headers = new Headers(res.headers);
            headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
            headers.set('Cross-Origin-Opener-Policy', 'same-origin');
            return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
        });
    }
}