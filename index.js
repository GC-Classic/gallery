import {E,Q} from 'https://aeoq.github.io/AEOQ.mjs'
import PointerInteraction from 'https://aeoq.github.io/pointer-interaction/script.js'

const Form = {
    el: document.forms[0],
    debounce: false,
    multi: false,
    init () {
        fetch('./category.json').then(resp => resp.json())
        .then(json => Form.el.append(...Object.entries(json).map(([name, values]) => 
            E('fieldset', {id: name}, [
                E('div', E.checkboxes(Array.isArray(values) ? 
                    values.map(c => ({name, value: c, title: `${c}`}) ) : 
                    Object.entries(values).map(([c, title]) => ({name, value: c, title}) ))
                )
            ])
        )));
        Form.el.Q('#char div').append(...[...Array(20)].map((_, i) => 
            E('label', {
                classList: 'char',
                '--x': i % 8, '--y': Math.floor(i / 8)
            }, [E('input', {
                name: 'char', value: i,
                type: 'checkbox'
            })])
        ));
    },
    events () {
        Form.el.onchange = ev => {
            Query.offset(0);
            ev.target.matches('fieldset div input') && ev.target.checked && !Form.multi 
                && ev.target.closest('fieldset').Q('div input', input => input.checked = input == ev.target);

            let params = Object.entries(
                [...new FormData(Form.el)].reduce((obj, [name, value]) => ({...obj, [name]: `${obj[name] ?? ''}${value},`}), {})
            );
            params.length && Query(`api/?${new URLSearchParams(params).toString()}`, 0)
        }
        document.forms[1].oninput = ev => {
            if (ev.target.value.length <= 1) return;
            clearTimeout(Form.debounce);
            Form.debounce = setTimeout(() => Query(
                /^#[\d,]+/.test(ev.target.value) ? `sql/select * from item where id in (${/^#([\d,]+)(.*)$/.exec(ev.target.value)[1]}) and ${/^#([\d,]+)(.*)$/.exec(ev.target.value)[2] || 'true'}` :
                /^select /i.test(ev.target.value) ? `sql/${ev.target.value}` : `api/search/${ev.target.value}`)
            , 1000)
        }
        Q('#random').onclick = () => Query(`api/random/`)
        Q('#delete').onclick = () => Query(`api/reset/`).then(() => setTimeout(() => location.reload(), 1000));
        PointerInteraction.events({
            'fieldset div': {drag: PI => PI.drag.to.scroll({x: true, y: false})},
            '#result figure': {
                drag: PI => {
                    if (PI.target.downloaded || PI.$drag.x - PI.$press.x > -50) return; 
                    Image.download(PI.target);
                    PI.target.downloaded = true;
                },
                hold: hold => hold.for(.5).to((_, target) => {
                    let char = parseInt(target.dataset.char), figure = target.cloneNode(true);
                    Image.popup.replaceChildren(figure);
                    char != -1 && figure.append(E('i', {
                        classList: 'char', 
                        '--x': char % 8, '--y': Math.floor(char / 8)    
                    }));
                    Image.popup.showModal();
                }),
                lift: () => popup.close()
            }
        });
        addEventListener('keydown', ev => ev.key == 'Control' ? Form.multi = true :  '');
        addEventListener('keyup', ev => ev.key == 'Control' ? Form.multi = false : '');
    }
}
const Image = {
    popup: Q('#popup'),
    download: figure => {
        const canvas = E('canvas', {width: 128, height: 128});
        E('img', {
            src: figure.style.backgroundImage.match(/https.+?png/)[0],
            onload: ev => {
                canvas.getContext('2d').drawImage(ev.target, 
                    E(figure).get('--x')*128, E(figure).get('--y')*128, 128, 128, 
                    0, 0, 128, 128
                );
                E('a', {
                    href: canvas.toDataURL('image/png'),
                    download: figure.id + '.png'
                }).click()
            }
        })
    }
}

const Query = href =>
    fetch(/update/i.test(href) ? href : href ? Query.last = href : `${Query.last}#${Query.offset()}`).then(resp => resp.json())
    .then(re => {
        if (typeof re == 'string' || typeof re == 'number')
            return Q('#message').textContent = re;
        if (re.length === 0)
            return Q('#message').textContent = 'NO MORE RESULT'

        Q('#result')[href ? 'replaceChildren' : 'append'](...re.map(({ ID, char, name, desc }) => E('figure', {
            id: ID,
            '--id': ID,
            title: name,
            dataset: {char},
            style: {
                backgroundImage: `url('https://gc-classic.github.io/item/sprite/${Math.floor(ID / 100) * 100}.png'),linear-gradient(var(--bg),var(--bg))`,
            },
        }, [E('figcaption', {innerHTML: desc})])));
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
oncontextmenu = ev => ev.preventDefault();
new MutationObserver(([{ target }], observer) => {
    if (target.textContent) {
        target.showModal();
        clearTimeout(observer.timer);
        observer.timer = setTimeout(() => [target.textContent = '', target.close()], 2000)
    }
}).observe(Q('#message'), { childList: true });

export {Form, Query};
