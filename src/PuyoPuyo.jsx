import React, { useEffect, useRef, useState } from 'react';
const COLS = 6;
const ROWS = 12;
const EMPTY = 0;
const COLORS = [1, 2, 3, 4];

function randColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function cloneGrid(g) {
  return g.map(row => row.slice());
}

export default function PuyoPuyo() {
  const [grid, setGrid] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)));
  const [active, setActive] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [clearing, setClearing] = useState([]);
  const dropInterval = useRef(700);

  function inBounds(x, y) { return x >= 0 && x < COLS && y >= 0 && y < ROWS; }
  function getSubOffset(dir) { switch(dir%4){case 0:return[0,-1];case 1:return[1,0];case 2:return[0,1];case 3:return[-1,0];default:return[0,-1];} }

  function canPlace(pair){ const [sx,sy]=getSubOffset(pair.dir); return inBounds(pair.x,pair.y)&&grid[pair.y][pair.x]===EMPTY&&inBounds(pair.x+sx,pair.y+sy)&&grid[pair.y+sy][pair.x+sx]===EMPTY;}

  function spawnPair(){
    const main=randColor(), sub=randColor(), x=Math.floor(COLS/2)-1, y=1;
    const candidate={x,y,dir:0,main,sub};
    if(!canPlace(candidate)){setGameOver(true);setActive(null);return;}
    setActive(candidate);
  }

  function placeActiveToGrid(pair){
    const g=cloneGrid(grid);
    const {x,y,dir,main,sub}=pair;
    const [sx,sy]=getSubOffset(dir);
    g[y][x]=main; g[y+sy][x+sx]=sub;
    setGrid(g); return g;
  }

  function lockActive(){ if(!active) return; const newGrid=placeActiveToGrid(active); setActive(null); setChain(0); setTimeout(()=>resolveClears(newGrid),60); }

  function resolveClears(board){
    let g=board?cloneGrid(board):cloneGrid(grid); let totalCleared=0; let chainCount=0;
    async function processChain(){
      while(true){
        const groups=findGroups(g).filter(gr=>gr.cells.length>=4);
        if(groups.length===0) break;
        chainCount++;
        const cellsToAnimate=groups.flatMap(gr=>gr.cells);
        setClearing(cellsToAnimate);
        await new Promise(res=>setTimeout(res,300));
        for(const [r,c] of cellsToAnimate) g[r][c]=EMPTY;
        totalCleared+=cellsToAnimate.length;
        applyGravityToGrid(g);
        setClearing([]);
      }
      if(totalCleared>0){setGrid(g); setChain(prev=>prev+chainCount); setScore(s=>s+totalCleared*10*chainCount); setTimeout(spawnPair,200);} else {spawnPair();}
    }
    processChain();
  }

  function findGroups(g){
    const visited=Array.from({length:ROWS},()=>Array(COLS).fill(false));
    const groups=[];
    for(let r=0;r<ROWS;r++){for(let c=0;c<COLS;c++){if(g[r][c]===EMPTY||visited[r][c]) continue; const color=g[r][c]; const q=[[r,c]]; visited[r][c]=true; const cells=[];
      while(q.length){const [rr,cc]=q.shift();cells.push([rr,cc]); for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nr=rr+dr,nc=cc+dc; if(!inBounds(nc,nr)||visited[nr][nc]||g[nr][nc]!==color) continue; visited[nr][nc]=true; q.push([nr,nc]);}}
      groups.push({color,cells});}}
    return groups;
  }

  function applyGravityToGrid(g){
    for(let c=0;c<COLS;c++){ let write=ROWS-1; for(let r=ROWS-1;r>=0;r--){if(g[r][c]!==EMPTY){g[write][c]=g[r][c]; if(write!==r) g[r][c]=EMPTY; write--;}} for(let r=write;r>=0;r--) g[r][c]=EMPTY;}
  }

  function canMove(pair,dx,dy,newDir=null){
    const next={...pair,x:pair.x+dx,y:pair.y+dy}; if(newDir!==null) next.dir=newDir;
    const [sx,sy]=getSubOffset(next.dir);
    return inBounds(next.x,next.y)&&inBounds(next.x+sx,next.y+sy)&&grid[next.y][next.x]===EMPTY&&grid[next.y+sy][next.x+sx]===EMPTY;
  }

  function moveActive(dx,dy){ if(!active) return; if(canMove(active,dx,dy,active.dir)) setActive(a=>({...a,x:a.x+dx,y:a.y+dy})); else if(dy===1) lockActive(); }
  function rotateActive(dir){ if(!active) return; const newDir=(active.dir+dir+4)%4; if(canMove(active,0,0,newDir)) setActive(a=>({...a,dir:newDir})); }
  function hardDrop(){ if(!active) return; let dy=0; while(canMove(active,0,dy+1,active.dir)) dy++; if(dy>0) setActive(a=>({...a,y:a.y+dy})); setTimeout(lockActive,0); }

  useEffect(()=>{
    function handleKey(e){
      if(!active||gameOver) return;
      switch(e.key){
        case 'ArrowLeft': moveActive(-1,0); e.preventDefault(); break;
        case 'ArrowRight': moveActive(1,0); e.preventDefault(); break;
        case 'ArrowDown': moveActive(0,1); e.preventDefault(); break;
        case 'z': case 'Z': rotateActive(-1); e.preventDefault(); break;
        case 'x': case 'X': rotateActive(1); e.preventDefault(); break;
        case ' ': hardDrop(); e.preventDefault(); break;
      }
    }
    window.addEventListener('keydown',handleKey);
    return ()=>window.removeEventListener('keydown',handleKey);
  },[active,gameOver,grid]);

  useEffect(()=>{
    if(!active||gameOver) return;
    const id=setInterval(()=>canMove(active,0,1,active.dir)?setActive(a=>({...a,y:a.y+1})):lockActive(),dropInterval.current);
    return ()=>clearInterval(id);
  },[active,gameOver,grid]);

  useEffect(()=>{spawnPair();},[]);

  function getDisplayGrid(){
    const g=cloneGrid(grid);
    if(active){const {x,y,dir,main,sub}=active; g[y][x]=main; const [sx,sy]=getSubOffset(dir); if(inBounds(x+sx,y+sy)) g[y+sy][x+sx]=sub;}
    return g;
  }

  function renderCell(val,r,c){
    const classes='w-8 h-8 rounded-full border relative flex items-center justify-center';
    if(val===EMPTY) return <div key={`${r}-${c}`} className="w-8 h-8" />;
    let bg=['bg-red-500','bg-blue-500','bg-yellow-400','bg-green-500'][val-1]||'bg-gray-400';
    return (<div key={`${r}-${c}`} className="flex items-center justify-center"><div className={`${classes} ${bg} animate-pulse`}>
      <div className="absolute w-1.5 h-1.5 bg-black rounded-full left-1 top-1" />
      <div className="absolute w-1.5 h-1.5 bg-black rounded-full right-1 top-1" />
    </div></div>);
  }

  function restart(){setGrid(Array.from({length:ROWS},()=>Array(COLS).fill(EMPTY))); setScore(0); setChain(0); setGameOver(false); setActive(null); setTimeout(spawnPair,200);}

  const display=getDisplayGrid();

  return (<div className="p-6 font-sans"><div className="flex gap-6"><div><div className="bg-slate-800 p-2 rounded-lg"><div className="grid" style={{gridTemplateColumns:`repeat(${COLS},2rem)`,gap:'4px'}}>{display.map((row,r)=>row.map((cell,c)=>renderCell(cell,r,c)))}</div></div></div><div className="text-white"><h2 className="text-xl font-bold mb-2">ぷよぷよ簡易版</h2><p>Score: {score}</p><p>Chain: {chain}</p><p className="mt-4">Controls:</p><ul className="list-disc ml-5"><li>← → : 移動</li><li>↓ : ソフトドロップ</li><li>Z / X : 回転</li><li>Space : ハードドロップ</li></ul><div className="mt-4"><button onClick={restart} className="px-3 py-1 rounded bg-blue-600 text-white">Restart</button></div>{gameOver&&<div className="mt-4 text-red-300 font-bold">Game Over</div>}<div className="mt-6 text-sm text-gray-300 max-w-xs"><p>注意: これは教育・プロトタイプ目的の簡易実装です。</p></div></div></div></div>);
}
