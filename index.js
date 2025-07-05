import {E,Q} from 'https://aeoq.github.io/AEOQ.mjs'
import PointerInteraction from 'https://aeoq.github.io/pointer-interaction/script.js'

const Form = {
    el: document.forms[0],
    debounce: false,
    init () {
        fetch('./category.json').then(resp => resp.json())
            .then(json => Form.el.append(...Object.entries(json).map(([name, values]) => 
                E('fieldset', {id: name}, [
                    E('label', ['All', E('input', {type: 'checkbox', value: 'all'})]),
                    E('div', E.checkboxes(Array.isArray(values) ? 
                        values.map(c => ({name, value: c, title: `${c}`}) ) : 
                        Object.entries(values).map(([c, title]) => ({name, value: c, title}) ))
                    )
                ])
            )));
        Form.el.Q('#char div').append(...E.checkboxes([...Array(20)].map((_, i) => ({name: 'char', value: i}) )));
    },
    events () {
        Form.el.onchange = ev => {
            Query.offset(0);
            ev.target.value == 'all' 
                && ev.target.closest('fieldset').Q('div input', input => input.checked = ev.target.checked);
            ev.target.matches('fieldset div input') && !ev.target.checked 
                && (ev.target.closest('fieldset').Q('[value=all]').checked = false);

            let params = Object.entries(
                [...new FormData(Form.el)].reduce((obj, [name, value]) => ({...obj, [name]: `${obj[name] ?? ''}${value},`}), {})
            );
            params.length && Query(`api/?${new URLSearchParams(params).toString()}`, 0)
        }
        document.forms[1].oninput = ev => {
            if (ev.target.value.length <= 1) return;
            clearTimeout(Form.debounce);
            Form.debounce = setTimeout(() => 
                Query(/^select /i.test(ev.target.value) ? `sql/${ev.target.value}` : `api/search/${ev.target.value}`)
            , 1000)
        }
        Q('#random').onclick = () => Query(`api/random/`)
        Q('#delete').onclick = () => Query(`api/reset/`);
        PointerInteraction.events({
            'fieldset div': {drag: PI => PI.drag.to.scroll({x: true, y: false})},
            '#result img': {
                drag: PI => {
                    if (PI.target.downloaded || PI.$drag.x - PI.$press.x > -50) return; 
                    Image.download(PI.target.src, PI.target.alt + '.png');
                    PI.target.downloaded = true;
                },
                hold: hold => hold.for(.5).to((_, target) => {
                    Image.popup.replaceChildren(target.cloneNode());
                    Image.popup.showModal();
                }),
                lift: () => popup.close()
            }
        });
    }
}
const Image = {
    popup: Q('#popup'),
    download: (src, file) => 
        fetch(src, {mode: 'cors'})
        .then(resp => resp.blob())
        .then(blob => E('a', {href: URL.createObjectURL(blob), download: file}).click())
}

const Query = href =>
    fetch(href ? Query.last = href : `${Query.last}#${Query.offset()}`).then(resp => resp.json())
        .then(re => {
            if (typeof re == 'string' || typeof re == 'number')
                return Q('#message').textContent = re;
            if (re.length === 0)
                return Q('#message').textContent = 'NO MORE RESULT'

            Q('#result')[href ? 'replaceChildren' : 'append'](...re.map(({ ID }) => 
                E('figure', [
                    E('img', {
                        crossOrigin: 'anonymous',
                        src: `https://gc-classic.github.io/item/${Math.ceil(ID / 200000) * 20}/sbta${ID / 10}.png`,
                    }),
                    E('figcaption', ID / 10)
                ]))
            );
            Query.offset(re.at(-1).ID);
        })
        .catch(er => [console.error(er), Q('#message').textContent = er.toString()]);  

Object.assign(Query, {
    offset: id => id ? Form.el.dataset.offset = id : Form.el.dataset.offset,
    cooldown: false,
    events () {
        addEventListener('scroll', () => 
            pageYOffset + innerHeight >= document.documentElement.scrollHeight - 2
            && Query.offset() && !Query.cooldown 
            && (Query.cooldown = true) && setTimeout(() => Query.cooldown = false, 1000) && Query()
        );
    }
});
new MutationObserver(([{ target }], observer) => {
    if (target.textContent) {
        target.showModal();
        clearTimeout(observer.timer);
        observer.timer = setTimeout(() => [target.textContent = '', target.close()], 2000)
    }
}).observe(Q('#message'), { childList: true })
export {Form, Query};