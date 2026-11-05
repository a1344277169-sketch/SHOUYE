// The presentation is always a phone. The guided animation uses the same real screens.
let demoRunning=false,demoTimers=[],demoStep=0,lastScreen='';
const demoCaptions=['日常の投稿から、交流が始まります。','気分でおしゃべりを開きます。','シニアの画面に切り替えます。','今日は、日常を話したい気分。','若者の画面：今日はちょっと愚痴りたい。','今の気分に合う、お相手に出会います。','ひとこと、おしゃべりのお誘い。','友だちが、あなたの話を聞いてくれます。','ボトルレターを開きます。','別の世代からのお便りをひろいます。','今度は、顔を合わせておしゃべり。','笑顔も分けあう、ビデオの時間。','また、お話ししましょう。'];
const originalModal=modal;
modal=function(title,body){originalModal(title,body);positionDialog()};
function positionDialog(){if(!dialog.open)return;const box=document.querySelector('.workspace').getBoundingClientRect();dialog.style.left=(box.left+16)+'px';dialog.style.top=(box.top+30)+'px';dialog.style.width=(box.width-32)+'px';dialog.style.maxHeight=(box.height-60)+'px';dialog.style.margin='0';}
window.addEventListener('resize',positionDialog);
render=function(){
 document.body.dataset.persona=state.persona;document.body.classList.toggle('demo-running',demoRunning);
 const screen=state.page+state.persona,animate=screen!==lastScreen;lastScreen=screen;
 const featureCopy=[['別の世代へ、お便りを流す','名前を知らない誰かと、言葉でつながる。'],['日常を分けあう','写真やひとことから、誰かの毎日を知る。'],['今の気分で、話し相手を探す','聞いてほしい日も、誰かの話を聞きたい日も。'],['友だちと、お話の続きを','文字と声で、ゆっくり仲良く。'],['顔を合わせて、話してみる','お互いの都合が合うときに、ビデオで。']];
 document.getElementById('app').innerHTML=`<div class="layout"><aside class="desktop-note"><a class="desktop-brand" href="#/forum"><img src="assets/logo-generations.png" alt="">となり便り</a><h2 class="desktop-title">ちがう世代の、<br>いつものとなりに。</h2><div class="desktop-companions"><img src="assets/${state.persona==='senior'?'grandpa':'young-man'}.png" alt="いつもの小人"><p>今日のこと、少し話しませんか。</p></div><div class="demo-features">${navItems.map(([id,ic],i)=>`<a class="demo-feature ${state.page===id?'active':''}" href="#/${id}">${icon(ic)}<span><strong>${featureCopy[i][0]}</strong><small>${featureCopy[i][1]}</small></span></a>`).join('')}</div><div class="demo-controls"><button class="primary" data-action="play-demo">${icon(demoRunning?'close':'play')}${demoRunning?'デモを止める':'自動デモを再生'}</button><small>約20秒 / 操作もできます</small></div><div class="demo-progress"><span style="width:${demoRunning?(demoStep/12)*100:0}%"></span></div><p class="demo-caption">${demoRunning?demoCaptions[demoStep]:'右のスマートフォンで、機能を体験できます。<br>上のスイッチで、シニアと若者の画面を切り替え。'}</p></aside><div class="workspace" data-page="${state.page}"><header class="topbar"><a class="mobile-brand" href="#/forum"><img src="assets/logo-generations.png" alt="">となり便り</a><div class="persona-switch" role="group" aria-label="表示する立場"><button data-action="persona" data-value="senior" aria-pressed="${state.persona==='senior'}">シニア</button><button data-action="persona" data-value="young" aria-pressed="${state.persona==='young'}">若者</button></div></header><main id="main" tabindex="-1" class="${animate?'page-enter':''}"><button class="demo-mobile-toggle" data-action="play-demo">${icon(demoRunning?'close':'play')}${demoRunning?'デモを止める':'自動デモを再生'}</button>${({forum,mood:moodPage,bottles:bottlePage,friends:friendsPage,video:videoPage}[state.page]||forum)()}</main>${nav(true)}</div></div>`;
 document.title=`${navItems.find(n=>n[0]===state.page)?.[2]||'暮らしの広場'} | となり便り`;
 if(dialog.open)positionDialog();
};
function updateDemoControls(){document.body.classList.toggle('demo-running',demoRunning);document.querySelectorAll('[data-action="play-demo"]').forEach(b=>{b.innerHTML=icon(demoRunning?'close':'play')+(demoRunning?'デモを止める':'自動デモを再生')});const caption=document.querySelector('.demo-caption');if(caption)caption.textContent=demoRunning?demoCaptions[demoStep]:'画面を直接タップして体験できます。';}
function stopDemo(){demoTimers.forEach(clearTimeout);demoTimers=[];demoRunning=false;document.querySelectorAll('.demo-hand').forEach(e=>e.remove());updateDemoControls();}
function demoView(page,persona,step,extra={}){if(dialog.open)closeModal();Object.assign(state,{page,persona},extra);demoStep=step;render();}
function showDemoHand(selector){
  document.querySelectorAll('.demo-hand').forEach(e=>e.remove());
  const root=dialog.open?dialog:document.querySelector('.workspace');
  const target=root.querySelector(selector);
  if(!demoRunning||!target)return;
  target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  const hand=document.createElement('div');
  hand.className='demo-hand';hand.setAttribute('aria-hidden','true');
  hand.innerHTML='<span class="demo-tap-ring"></span><svg viewBox="0 0 48 60"><path d="M15 28V7a4 4 0 0 1 8 0v16-4a4 4 0 0 1 8 0v5-2a4 4 0 0 1 8 0v5a4 4 0 0 1 7 2v14c0 7-4 11-7 14H20c-1-7-6-12-10-17l-5-6c-3-4 1-9 5-6l5 4"/></svg>';
  root.appendChild(hand);
  const r=target.getBoundingClientRect(),p=root.getBoundingClientRect();
  hand.style.left=(r.left-p.left+r.width/2-16+root.scrollLeft)+'px';
  hand.style.top=(r.top-p.top+r.height/2-6+root.scrollTop)+'px';
}
function startDemo(){
  stopDemo();demoRunning=true;state.filter='すべて';state.messages={};
  if(typeof matchTurns!=='undefined')Object.keys(matchTurns).forEach(k=>delete matchTurns[k]);
  state.video.status='ready';
  demoView('forum','young',0);
  function at(time,fn){demoTimers.push(setTimeout(()=>{if(demoRunning)fn()},time));}
  function tap(time,selector,action){
    at(time-450,()=>showDemoHand(selector));
    at(time,()=>{document.querySelectorAll('.demo-hand').forEach(e=>e.remove());action()});
  }
  tap(1300,'.mobile-nav a[href="#/mood"]',()=>demoView('mood','young',1));
  tap(2400,'[data-action="persona"][data-value="senior"]',()=>demoView('mood','senior',2,{mood:0}));
  tap(3400,'.mood-option[data-id="1"]',()=>demoView('mood','senior',3,{mood:1}));
  tap(4500,'[data-action="persona"][data-value="young"]',()=>demoView('mood','young',4,{mood:0}));
  tap(5500,'[data-action="match"]',()=>{demoStep=5;render();match()});
  tap(7000,'[data-action="invite"]',()=>{demoStep=6;dialog.querySelector('[data-action="invite"]').click();updateDemoControls()});
  tap(8000,'[data-action="samplechat"]',()=>{demoStep=7;dialog.querySelector('[data-action="samplechat"]').click();updateDemoControls()});
  tap(10200,'.mobile-nav a[href="#/bottles"]',()=>demoView('bottles','young',8));
  tap(11200,'[data-action="pick"]',()=>{demoStep=9;render();pickLetter()});
  tap(13200,'[data-action="close"]',()=>{closeModal();render()});
  tap(14100,'.mobile-nav a[href="#/video"]',()=>{state.video.status='ready';demoView('video','young',10)});
  tap(15100,'[data-action="video-invite"]',()=>openVideoInvite());
  tap(16200,'[data-action="video-connect"]',()=>{demoStep=11;connectVideo()});
  tap(19000,'[data-action="video-end"]',()=>{demoStep=12;endVideo()});
  at(20000,()=>{stopDemo()});
}

document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='play-demo'){e.preventDefault();demoRunning?stopDemo():startDemo();return;}if(e.isTrusted&&demoRunning)stopDemo();const link=e.target.closest('a[href^="#/"]');if(link){const page=link.getAttribute('href').slice(2);if(location.hash===`#/${page}`&&state.page!==page){state.page=page;render();}}},true);
document.addEventListener('keydown',e=>{if(e.isTrusted&&demoRunning)stopDemo()},true);
render();
