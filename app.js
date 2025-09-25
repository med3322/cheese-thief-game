const app = document.getElementById('app');

// state
let currentPage = 'menu';
let players = [];
let assignedRoles = {};
let diceResults = {};
let currentIndex = 0;
let cheeseStolen = false;
let discussionTimer = null;
let discussionRemaining = 0;
let roosterPlayed = false;
let muted = false;

// audio
const bgMusic = document.getElementById('bgMusic');
const nightMusic = document.getElementById('nightMusic');
const rooster = document.getElementById('rooster');

// ---------- AUDIO ----------
function ensureBg(){
  if(bgMusic.paused && !muted){
    bgMusic.play().catch(()=>{});
  }
}
function playNight(){
  bgMusic.pause();
  if(!muted){
    nightMusic.currentTime=0;
    nightMusic.play().catch(()=>{});
  }
}
function stopNight(){
  nightMusic.pause();
  ensureBg();
}
function playRoosterOnce(){
  if(!roosterPlayed && !muted){
    rooster.currentTime=0;
    rooster.play().catch(()=>{});
    roosterPlayed = true;
  }
}
function toggleMute(){
  muted=!muted;
  if(muted){
    bgMusic.pause(); nightMusic.pause(); rooster.pause();
  } else ensureBg();
  render();
}

// ---------- UTILS ----------
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function formatTime(sec){ if(sec<0) sec=0; const m=Math.floor(sec/60); const s=sec%60; return `${m}:${String(s).padStart(2,'0')}` }

// ---------- RENDER ----------
function render(){
  if(['menu','settings','setup','nameInput','roles','revealRole','discussion','vote','result'].includes(currentPage)){ ensureBg(); }
  if(currentPage==='night'){ playNight(); }
  if(currentPage==='morning'){ stopNight(); playRoosterOnce(); }

  let muteBtn = `<button class="mute-btn" onclick="toggleMute()">${muted?'🔇':'🔊'}</button>`;

  if(currentPage==='menu')
    return app.innerHTML=`<h1>🧀 Cheese Thief</h1>${muteBtn}
      <div class="menu">
        <button class="btn" onclick="goSetup()">▶ เริ่มเกม</button>
        <button class="btn secondary" onclick="goSettings()">⚙️ ตั้งค่า</button>
        <button class="btn danger" onclick="closeWindow()">❌ ออกจากเกม</button>
      </div>`;

  if(currentPage==='settings')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>ตั้งค่า</h2>
      <p>ปรับระดับเสียง:</p>
      <input type="range" min="0" max="1" step="0.1" value="${bgMusic.volume}" onchange="setVolume(this.value)">`;

  if(currentPage==='setup')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>เลือกจำนวนผู้เล่น</h2>
      ${[4,5,6,7,8].map(n=>`<button class="btn" onclick="chooseCount(${n})">${n} คน</button>`).join('')}`;

  if(currentPage==='nameInput')
    return app.innerHTML=`<button class="back-btn" onclick="goSetup()">←</button>${muteBtn}
      <h2>กรอกชื่อผู้เล่น</h2>
      <div class="input-list">
        ${players.map((p,i)=>`<input id="name_${i}" placeholder="ผู้เล่น ${i+1}" value="${p||''}">`).join('')}
      </div>
      <button class="btn" onclick="confirmNames()">✅ ยืนยันและสุ่มบทบาท</button>`;

  if(currentPage==='roles'){
    let p = players[currentIndex];
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>ถึงตา: ${p}</h2>
      <p>ส่งอุปกรณ์ให้ <b>${p}</b></p>
      <button class="btn" onclick="goReveal()">🔍 กดเพื่อดูบทบาทของคุณ</button>`;
  }

  if(currentPage==='revealRole'){
    let p = players[currentIndex];
    let roleImg = assignedRoles[p];
    let diceFace = diceResults[p] || 1;
    app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <div class="role-card">
        <div class="role-inner" id="roleInner">
          <div class="role-front">
            <h2>👀 พลิกการ์ดเพื่อดูบทบาท</h2>
          </div>
          <div class="role-back">
            <h2>${p}</h2>
            <img src="${roleImg}" alt="role">
            <img class="dice-preview" src="dice${diceFace}.PNG" alt="dice">
            <button class="btn" onclick="nextRole()">ซ่อน & ส่งต่อคนถัดไป</button>
          </div>
        </div>
      </div>`;
    // trigger flip after render
    setTimeout(()=>{
      const inner=document.getElementById('roleInner');
      if(inner) inner.classList.add('flipped');
    },100);
    return;
  }

  if(currentPage==='night')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>🌙 ตอนกลางคืน</h2>
      <div class="cheese-area">
        ${!cheeseStolen?`<img src="cheese.png" class="cheese-img"><button class="btn secondary" onclick="onCheeseClick()">ขโมยชีส</button>`:`<div class="stolen-msg">ชีสถูกขโมย!!</div>`}
      </div>
      <div class="cups-area">
        ${players.map(p=>`<div class="cup" onclick="onCupClick(this)">
            <img src="cup.png" class="cup-img">
            <img src="dice${diceResults[p]||1}.PNG" class="dice-img">
            <div style="text-align:center">${p}</div>
          </div>`).join('')}
      </div>
      <button class="btn" style="margin-top:18px" onclick="goMorning()">🌅 เช้าแล้ว</button>`;

  if(currentPage==='morning')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>🌅 ตอนเช้า</h2>
      <button class="btn" onclick="startDiscussion()">เริ่มสนทนา</button>`;

  if(currentPage==='discussion')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>สนทนา</h2>
      <div id="countdown">${formatTime(discussionRemaining)}</div>
      <button class="btn" onclick="goVote()">เริ่มโหวต</button>`;

  if(currentPage==='vote')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>โหวต</h2>
      ${players.map(p=>`<div class="vote-card">
        <div>${p}</div>
        <button class="btn" onclick="castVote('${p}')">โหวต</button>
      </div>`).join('')}`;

  if(currentPage==='result')
    return app.innerHTML=`<button class="back-btn" onclick="goMenu()">←</button>${muteBtn}
      <h2>${window._gameResultText||'ผลลัพธ์'}</h2>
      <div><button class="btn" onclick="restart()">🔁 เริ่มใหม่</button></div>`;
}

// ---------- LOGIC ----------
function goMenu(){ currentPage='menu'; render(); }
function goSettings(){ currentPage='settings'; render(); }
function goSetup(){ currentPage='setup'; render(); }
function chooseCount(n){ players=new Array(n).fill(''); currentPage='nameInput'; render(); }
function confirmNames(){
  players=players.map((_,i)=> document.getElementById('name_'+i).value.trim()||`ผู้เล่น${i+1}`);
  assignRolesAndDice();
  currentIndex=0;
  currentPage='roles';
  render();
}
function assignRolesAndDice(){
  let shuffled = shuffle([...players]);
  assignedRoles={};
  assignedRoles[shuffled[0]]='thief.PNG';
  if(players.length>=6){
    assignedRoles[shuffled[1]]='scapegoat.PNG';
    for(let i=2;i<shuffled.length;i++) assignedRoles[shuffled[i]]=`sleepy${(i-1)%7+1}.PNG`;
  } else {
    for(let i=1;i<shuffled.length;i++) assignedRoles[shuffled[i]]=`sleepy${i%7+1}.PNG`;
  }
  players.forEach(p=>{
    let frames=0;
    let interval=setInterval(()=>{
      diceResults[p]=Math.floor(Math.random()*6)+1;
      if(currentPage==='revealRole') render();
      frames++;
      if(frames>8) clearInterval(interval);
    },100);
  });
}
function goReveal(){ currentPage='revealRole'; render(); }
function nextRole(){
  currentIndex++;
  if(currentIndex<players.length){ currentPage='roles'; render(); }
  else { currentPage='night'; render(); }
}
function onCupClick(el){ el.classList.add('lifted'); setTimeout(()=>el.classList.remove('lifted'),3000); }
function onCheeseClick(){ cheeseStolen=true; render(); }
function goMorning(){ currentPage='morning'; render(); }
function startDiscussion(){
  discussionRemaining=300;
  currentPage='discussion'; render();
  if(discussionTimer) clearInterval(discussionTimer);
  discussionTimer=setInterval(()=>{
    discussionRemaining--;
    const el=document.getElementById('countdown');
    if(el) el.innerText=formatTime(discussionRemaining);
    if(discussionRemaining<=0){ clearInterval(discussionTimer); goVote(); }
  },1000);
}
function goVote(){ if(discussionTimer) clearInterval(discussionTimer); currentPage='vote'; render(); }
function castVote(name){
  const thief='thief.PNG';
  window._gameResultText=assignedRoles[name]===thief?'✅ ถูกต้อง! จับขโมยได้':'❌ ผิด! หนูขโมยชีสชนะ';
  currentPage='result'; render();
}
function restart(){ currentPage='setup'; render(); }
function closeWindow(){ alert("ปิดแท็บเพื่อออกเกม"); }
function setVolume(v){ bgMusic.volume=v; nightMusic.volume=v; rooster.volume=v; }

// init
bgMusic.volume=0.6; nightMusic.volume=0.6; rooster.volume=0.6;
goMenu();
