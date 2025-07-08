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
        Form.el.Q('#char div').append(...E.checkboxes([...Array(20)].map((_, i) => ({name: 'char', value: i}) )));
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
            Form.debounce = setTimeout(() => 
                Query(/^select /i.test(ev.target.value) ? `sql/${ev.target.value}` : `api/search/${ev.target.value}`)
            , 1000)
        }
        Q('#random').onclick = () => Query(`api/random/`)
        Q('#delete').onclick = () => Query(`api/reset/`);
        PointerInteraction.events({
            'fieldset div': {drag: PI => PI.drag.to.scroll({x: true, y: false})},
            '#result figure': {
                drag: PI => {
                    if (PI.target.downloaded || PI.$drag.x - PI.$press.x > -50) return; 
                    Image.download(PI.target);
                    PI.target.downloaded = true;
                },
                hold: hold => hold.for(.5).to((_, target) => {
                    Image.popup.replaceChildren(target.cloneNode());
                    Image.popup.showModal();
                }),
                lift: () => popup.close()
            }
        });
        addEventListener('keydown', ev => ev.key == 'Control' ? Form.multi = true : ev.key == 'Shift' ? Query.shift = true :
            /^[0-9]$/.test(ev.key) ? update(ev.key) : ev.key == 'Backspace' ? update() : ''
        );
        addEventListener('keyup', ev => ev.key == 'Control' ? Form.multi = false : ev.key == 'Shift' ? Query.shift = false : '');
    }
}
const update = numeric => {
    let cat = Q('figure:nth-child(1 of .selected)').dataset.cat ?? '';
    cat = numeric ? cat + numeric : cat.slice(0, -1);
    Q('figure.selected', figure => figure.dataset.cat = cat);
    let selected = [...document.querySelectorAll('figure.selected')];
    Q('textarea:first-of-type').textContent = `update item set category=${cat} where id in (${selected.map(figure=>figure.id)});`
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
                    download: figure.Q('figcaption').textContent + '.png'
                }).click()
            }
        })
    }
}

const Query = href =>
    fetch(href ? Query.last = href : `${Query.last}#${Query.offset()}`).then(resp => resp.json())
        .then(re => {
            if (typeof re == 'string' || typeof re == 'number')
                return Q('#message').textContent = re;
            if (re.length === 0)
                return Q('#message').textContent = 'NO MORE RESULT'

            Q('#result')[href ? 'replaceChildren' : 'append'](...re.map(({ ID }) => E('figure', {
                id: ID,
                style: {
                    backgroundImage: `url('https://gc-classic.github.io/item/sprite/${Math.floor(ID / 100) * 100}.png'),linear-gradient(var(--bg),var(--bg))`,
                },
                '--x': ID % 10, '--y': Math.floor(ID % 100 / 10)
            }, [E('figcaption', ID)])));
            Query.offset(re.at(-1).ID);
        })
        .catch(er => [console.error(er), Q('#message').textContent = er.toString()]);  

Object.assign(Query, {
    offset: id => id ? Form.el.dataset.offset = id : Form.el.dataset.offset,
    cooldown: false,
    shift: false,
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

Q('#result').addEventListener('click', ev => {
    let [figures, selected] = [[...Q('#result').children], [...document.querySelectorAll('#result .selected')]];
    if (Query.shift && selected.length >= 1) {
        let current = figures.indexOf(ev.target);
        let [start, end] = [figures.indexOf(selected[0]), figures.indexOf(selected.at(-1))];
        let to = start <= current && end <= current ? start : start > current && end > current ? end : null;
        figures.slice(Math.min(to, current), Math.max(to, current)).forEach(figure => figure.classList.add('selected'));
    } else if (!Form.multi && !Query.shift)
        Q('#result .selected', figure => figure != ev.target && figure.classList.remove('selected'));
    ev.target.classList.toggle('selected'); 
});
Q('#commit').onclick = ev => {
    //Query(`sql/${Q('textarea:first-of-type').textContent}`);
    Q('textarea:last-of-type').textContent += Q('textarea:first-of-type').textContent;
    Q('textarea:first-of-type').textContent = '';
    Q('figure.selected', figure => figure.remove());
}
addEventListener('beforeunload', (event) => {
    event.preventDefault(); // Needed for Chrome
    event.returnValue = ''; // Triggers the popup
});
export {Form, Query};
