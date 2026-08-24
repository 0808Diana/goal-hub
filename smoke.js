/* Smoke test for goal-hub.html — runs the full script under a minimal DOM stub. */
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('NO_SCRIPT'); process.exit(1); }
let src = m[1];

function makeCtx() {
  return new Proxy({}, {
    get(t,p){ if (p in t) return t[p]; return function(){}; },
    set(t,p,v){ t[p]=v; return true; }
  });
}
function makeEl(tag) {
  const el = {
    tagName: tag || 'div',
    _attrs: {}, _children: [],
    style: {},
    classList: { _s:{}, add(c){this._s[c]=1;}, remove(c){delete this._s[c];}, toggle(c){ if(this._s[c]) delete this._s[c]; else this._s[c]=1; }, contains(c){return !!this._s[c];} },
    dataset: {},
    innerHTML: '', textContent: '', value: '', checked: false,
    appendChild(c){ this._children.push(c); return c; },
    removeChild(){}, remove(){},
    setAttribute(k,v){ this._attrs[k]=v; if(k.indexOf('data-')===0){ const dk=k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()); this.dataset[dk]=v; } },
    getAttribute(k){ return (k in this._attrs) ? this._attrs[k] : null; },
    removeAttribute(k){ delete this._attrs[k]; },
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    focus(){}, click(){},
    getContext(){ return makeCtx(); },
    getBoundingClientRect(){ return {left:0,top:0,width:0,height:0}; },
  };
  return el;
}
const document = {
  body: makeEl('body'),
  createElement: (t)=>makeEl(t),
  querySelector: ()=>makeEl('div'),
  querySelectorAll: ()=>[],
  getElementById: ()=>makeEl('div'),
  addEventListener(){},
};
const _store = {};
const localStorage = {
  getItem: (k)=> (k in _store ? _store[k] : null),
  setItem: (k,v)=>{ _store[k]=String(v); },
  removeItem: (k)=>{ delete _store[k]; },
};
const navigator = { userAgent:'node', clipboard: undefined };
const window = { addEventListener(){}, isSecureContext:false, innerWidth:1200, innerHeight:800 };

// expose to global so strict-eval free vars resolve
globalThis.document = document;
globalThis.localStorage = localStorage;
globalThis.navigator = navigator;
globalThis.window = window;
globalThis.innerWidth = 1200;
globalThis.innerHeight = 800;
globalThis.requestAnimationFrame = (cb)=>0;
globalThis.cancelAnimationFrame = ()=>{};
globalThis.setTimeout = (cb)=>0;     // do not execute async
globalThis.setInterval = ()=>0;
globalThis.clearTimeout = ()=>{};
globalThis.clearInterval = ()=>{};
globalThis.confirm = ()=>false;
globalThis.alert = ()=>{};

// Append a test routine that runs in the same strict-eval scope.
const appendix = `
;globalThis.__T = {
  ok: true,
  goals: S.goals.length,
  nodes: S.nodes.length,
  mapHTML: (function(){ try { return renderMapComposite().length; } catch(e){ globalThis.__T.mapErr = String(e); return -1; } })(),
  goalFormHTML: (function(){ try { return goalForm(null).length; } catch(e){ globalThis.__T.gfErr = String(e); return -1; } })(),
  nodeDetailHTML: (function(){ try { return S.nodes.length ? renderNodeDetail(S.nodes[0]).length : 0; } catch(e){ globalThis.__T.ndErr = String(e); return -1; } })(),
  n2n: (function(){
    try {
      var g = S.goals[0]; var n = S.nodes[0];
      setGoalNodes(g.id, [n.id]);
      var a = (S.nodes[0].taskIds.indexOf(g.id) >= 0);
      var b = (S.goals[0].nodeIds.indexOf(n.id) >= 0);
      // reverse: link from node side
      if (S.nodes[1] && S.goals[1]) {
        setNodeTasks(S.nodes[1].id, [S.goals[1].id]);
      }
      return a && b;
    } catch(e){ globalThis.__T.n2nErr = String(e); return false; }
  })(),
  linkSheet: (function(){ try { openLinkTaskSheet(S.nodes[0].id); return true; } catch(e){ globalThis.__T.lsErr = String(e); return false; } })(),
};
`;

try {
  eval(src + appendix);
} catch (e) {
  console.error('EVAL_ERROR:', e && e.stack ? e.stack : e);
  process.exit(2);
}

const T = globalThis.__T || {};
const failed = [];
if (T.mapHTML < 0) failed.push('renderMapComposite: ' + (T.mapErr||'?'));
if (T.goalFormHTML < 0) failed.push('goalForm: ' + (T.gfErr||'?'));
if (T.nodeDetailHTML < 0) failed.push('renderNodeDetail: ' + (T.ndErr||'?'));
if (!T.n2n) failed.push('N-to-N sync: ' + (T.n2nErr||'mismatch'));
if (!T.linkSheet) failed.push('openLinkTaskSheet: ' + (T.lsErr||'?'));

console.log('goals=' + T.goals + ' nodes=' + T.nodes +
  ' mapHTML=' + T.mapHTML + ' goalFormHTML=' + T.goalFormHTML +
  ' nodeDetailHTML=' + T.nodeDetailHTML + ' n2n=' + T.n2n + ' linkSheet=' + T.linkSheet);

if (failed.length) {
  console.error('SMOKE_FAIL:\n' + failed.join('\n'));
  process.exit(3);
}
console.log('SMOKE_OK');
