let workerS;
const DB = {
    db: null,
    open: sqlite => {
        DB.db = new sqlite.oo1.OpfsDb('mydb.sqlite3');
        let [table] = DB.SQL(`SELECT name FROM sqlite_master WHERE type='table' AND name='item'`);
        table || DB.init(new URLSearchParams(self.location.href).get('key'));
    },
    SQL: sql => DB.db.exec({ sql, rowMode: 'object' }),

    init: key => Promise.resolve(self.postMessage('Initializing'))
        .then(() => fetch('item.sql')).then(resp => resp.text())
        .then(sql => {
            DB.SQL(key ? CryptoJS.AES.decrypt(sql, key).toString(CryptoJS.enc.Utf8) : sql);
            self.postMessage({done: DB.SQL('SELECT count(*) from item')[0]['count(*)']});
        })
        .catch(er => {
            DB.discard();
            self.postMessage({error: er});
        }),

    discard: () => DB.SQL('DROP table item'),
};
const API = url => {
    let {pathname, search, hash} = new URL(url);
    search &&= [...new URLSearchParams(search)].map(([name, value]) => `${name} in (${value}'x')`).join(' and ');
    hash &&= `and id>${hash.substring(1)}`;
    let text = /[^/]+$/.exec(pathname)?.[0];
    let sql;
    try {
        if (url.includes('api/reset/'))
            return workerS.postMessage(DB.discard() && 'Deleted');
        if (url.includes('api/?'))
            sql = `select * from item where ${search} ${hash} and image=1 limit 500`;
        else if (url.includes('api/search/'))
            sql = /^[,\d]+$/.test(text) ? 
            `select * from item where id in (${text})` :
            `select * from item where (name like '%${text}%' or desc like '%${text}%') ${hash} and image=1 limit 500`;
        else if (url.includes('api/random/'))
            sql = `select * from item where image=1 order by random() limit 500`;
        else if (url.includes('sql/'))
            sql = decodeURIComponent(pathname.match(/(?<=sql\/).+/)) 
                + (url.includes('select') ? url.includes('where') ? ' and' : ' where' : '')
                + (url.includes('select') ? ' image=1 limit 500' : '');
        workerS.postMessage(DB.SQL(sql));
    }
    catch (er) {
        console.error(sql);
        return console.error(er) ?? workerS.postMessage(er);
    }
    return workerS.postMessage(404);
}

importScripts('jswasm/sqlite3.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

self.onmessage = ev => (workerS = ev.ports[0]).onmessage = ev => API(ev.data);
self.sqlite3InitModule().then(DB.open).catch(er => self.postMessage({error: er}))//.finally(() => db.close());

/*
DROP TABLE IF EXISTS item;
CREATE TABLE item (
  ID INTEGER NOT NULL PRIMARY KEY,
  name TEXT DEFAULT NULL,
  desc TEXT DEFAULT NULL,
  char INTEGER NOT NULL,
  category INTEGER NOT NULL,
  image INTEGER DEFAULT 0
);
*/