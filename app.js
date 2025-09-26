const app = document.getElementById('app');

// ---------- STATE ----------
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
let voteIndex = 0;
let votes = {}; // เก็บคะแนนโหวต

// ---------- AUDIO ----------
const bgMusic = document.getElementById('bgMusic');
const nightMusic = document.getElementById('nightMusic');
const rooster = document.getElementById('rooster');
const menuClick = document.getElementById('menuClick') || new Audio("menu-click.mp3");
const winSound = document.getElementById('winSound');
const loseSound = document.getElementById('loseSound');

bgMusic.volume = nightMusic.volume = rooster.volume = menuClick.volume = winSound.volume = loseSound.volume = 0.6;

// ---------- AUDIO FUNCTIONS ----------
function ensureBg() {
  if (bgMusic.paused && !muted) bgMusic.play().catch(()=>{});
}
function playNight() {
  if (!bgMusic.paused) bgMusic.pause();
  if (!nightMusic.paused) return;
  if (!muted) nightMusic.play().catch(()=>{});
}
function stopNight() {
  nightMusic.pause();
  ensureBg();
}
function playRoosterOnce() {
  if (!roosterPlayed && !muted) {
    rooster.currentTime = 0;
    rooster.play().catch(()=>{});
    roosterPlayed = true;
  }
}
function toggleMute() {
  muted = !muted;
  if (muted) bgMusic.pause(), nightMusic.pause(), rooster.pause();
  else ensureBg();
  render();
}
function playClick() {
  if (!muted && currentPage !== 'night') {
    menuClick.currentTime = 0;
    menuClick.play().catch(()=>{});
  }
}

// ---------- UTILS ----------
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function formatTime(sec){ if(sec<0) sec=0; const m=Math.floor(sec/60); const s=sec%60; return `${m}:${String(s).padStart(2,'0')}` }
function setVolume(v){ bgMusic.volume = nightMusic.volume = rooster.volume = menuClick.volume = winSound.volume = loseSound.volume = v; }

// ---------- CONFIRM MODAL ----------
function showConfirm(msg, onYes) {
  const modal = document.createElement("div");
  modal.className = "confirm-modal";
  modal.innerHTML = `
    <div class="confirm-box">
      <p>${msg}</p>
      <div class="confirm-actions">
        <button class="btn danger" id="cNo">❌ ยกเลิก</button>
        <button class="btn secondary" id="cYes">✅ ยืนยัน</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("cYes").onclick = () => { onYes(); modal.remove(); };
  document.getElementById("cNo").onclick = () => modal.remove();
}


// ---------- RENDER ----------
function render(){
  if(['menu','settings','setup','nameInput','roles','revealRole','discussion','vote','result'].includes(currentPage)) ensureBg();
  if(currentPage==='night') playNight();
  if(currentPage==='morning') stopNight(), playRoosterOnce();

  const muteBtn = `<button class="mute-btn" onclick="toggleMute()">${muted?'🔇':'🔊'}</button>`;
  const backBtn = `<button class="back-btn" onclick="goMenu()">←</button>`;

  switch(currentPage){
    case 'menu':
      app.innerHTML=`<h1>🧀 Cheese Thief</h1>${muteBtn}
        <div class="menu">
          <button class="btn" onclick="playClick();goSetup()">▶ เริ่มเกม</button>
          <button class="btn secondary" onclick="playClick();goSettings()">⚙️ ตั้งค่า</button>
          <button class="btn danger" onclick="playClick();closeWindow()">❌ ออกจากเกม</button>
        </div>`;
      break;

    case 'settings':
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>ตั้งค่า</h2>
        <p>ปรับระดับเสียง:</p>
        <input type="range" min="0" max="1" step="0.1" value="${bgMusic.volume}" onchange="setVolume(this.value)">`;
      break;

    case 'setup':
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>เลือกจำนวนผู้เล่น</h2>
        ${[3,4,5,6,7,8].map(n=>`<button class="btn" onclick="playClick();chooseCount(${n})">${n} คน</button>`).join('')}`;
      break;

    case 'nameInput':
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>กรอกชื่อผู้เล่น</h2>
        <div class="input-list">
          ${players.map((p,i)=>`<input id="name_${i}" placeholder="ผู้เล่น ${i+1}" value="${p||''}">`).join('')}
        </div>
        <button class="btn" onclick="playClick();confirmNames()">✅ ยืนยันและสุ่มบทบาท</button>`;
      break;

    case 'roles':
      const p = players[currentIndex];
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>ถึงตา: ${p}</h2>
        <p>ส่งอุปกรณ์ให้ <b>${p}</b></p>
        <button class="btn" onclick="playClick();goReveal()">🔍 กดเพื่อดูบทบาทของคุณ</button>`;
      break;

    case 'revealRole':
      const rp = players[currentIndex];
      const roleImg = assignedRoles[rp];
      const diceFace = diceResults[rp] || 1;
      app.innerHTML=`${backBtn}${muteBtn}
        <div class="role-card">
          <div class="role-inner" id="roleInner">
            <div class="role-front"><h2>👀 พลิกการ์ดเพื่อดูบทบาท</h2></div>
            <div class="role-back">
              <h2>${rp}</h2>
              <img src="${roleImg}" alt="role">
              <img class="dice-preview" src="dice${diceFace}.PNG" alt="dice">
              <button class="btn" onclick="playClick();nextRole()">ซ่อน & ส่งต่อคนถัดไป</button>
            </div>
          </div>
        </div>`;
      setTimeout(()=>{ const inner=document.getElementById('roleInner'); if(inner) inner.classList.add('flipped'); },100);
      break;

    case 'night':
      app.innerHTML=`${backBtn}${muteBtn}
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
        <button class="btn" style="margin-top:18px" onclick="playClick();goMorning()">🌅 เช้าแล้ว</button>`;
      break;

    case 'morning':
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>🌅 ตอนเช้า</h2>
        <button class="btn" onclick="playClick();startDiscussion()">เริ่มสนทนา</button>`;
      break;

    case 'discussion':
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>สนทนา</h2>
        <div id="countdown">${formatTime(discussionRemaining)}</div>
        <button class="btn" onclick="playClick();goVote()">เริ่มโหวต</button>`;
      break;

    case 'vote':
      const voter = players[voteIndex];
      app.innerHTML=`${backBtn}${muteBtn}
        <h2>โหวตโดย: ${voter}</h2>
        ${players.map(p=>`<div class="vote-card">
          <div>${p}</div>
          <button class="btn" onclick="castVote('${p}')">โหวต</button>
        </div>`).join('')}`;
      break;

    case 'result':
      app.innerHTML=`${muteBtn}
        <h2>${window._gameResultText}</h2>
        <div class="result-cards">
          ${players.map(p=>`
            <div class="result-card">
              <img src="${assignedRoles[p]}" alt="role">
              <div>🎭 ${p}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:20px">
          <button class="btn" onclick="restart()">🔁 เริ่มใหม่</button>
          <button class="btn secondary" onclick="goMenu()">🏠 หน้าหลัก</button>
        </div>`;
      if(!muted){
        if(window._gameResultText.includes('ถูกต้อง')){
          winSound.currentTime=0; winSound.play().catch(()=>{});
        } else {
          loseSound.currentTime=0; loseSound.play().catch(()=>{});
        }
      }
      break;
  }
}

// ---------- GAME LOGIC ----------
function goMenu(){ cheeseStolen=false; roosterPlayed=false; currentPage='menu'; render(); }
function goSettings(){ currentPage='settings'; render(); }
function goSetup(){ currentPage='setup'; render(); }
function chooseCount(n){ players = new Array(n).fill(''); currentPage='nameInput'; render(); }

function confirmNames(){
  players = players.map((_,i)=> document.getElementById('name_'+i).value.trim() || `ผู้เล่น${i+1}`);
  assignRolesAndDice();
  currentIndex = 0;
  currentPage = 'roles';
  render();
}

function assignRolesAndDice(){
  const shuffled = shuffle([...players]);
  assignedRoles = {};
  assignedRoles[shuffled[0]] = 'thief.PNG';
  if(players.length >= 6){
    assignedRoles[shuffled[1]] = 'scapegoat.PNG';
    for(let i=2;i<shuffled.length;i++) assignedRoles[shuffled[i]] = `sleepy${(i-1)%7+1}.PNG`;
  } else {
    for(let i=1;i<shuffled.length;i++) assignedRoles[shuffled[i]] = `sleepy${i%7+1}.PNG`;
  }

  players.forEach(p=>{
    let frames=0;
    const interval = setInterval(()=>{
      diceResults[p] = Math.floor(Math.random()*6)+1;
      if(currentPage==='revealRole') render();
      frames++;
      if(frames>8) clearInterval(interval);
    },100);
  });
}

function goReveal(){ currentPage='revealRole'; render(); }
function nextRole(){ currentIndex++; currentPage = currentIndex < players.length ? 'roles' : 'night'; render(); }

function onCupClick(el){ el.classList.add('lifted'); setTimeout(()=>el.classList.remove('lifted'),3000); }
function onCheeseClick(){ cheeseStolen=true; render(); }

function goMorning(){ showConfirm("🌅 เช้าแล้ว?", ()=>{ currentPage='morning'; render(); }); }
function startDiscussion(){
  showConfirm("เริ่มสนทนา?", ()=>{
    discussionRemaining=300;
    currentPage='discussion'; render();
    if(discussionTimer) clearInterval(discussionTimer);
    discussionTimer = setInterval(()=>{
      discussionRemaining--;
      const el=document.getElementById('countdown');
      if(el) el.innerText=formatTime(discussionRemaining);
      if(discussionRemaining<=0){ clearInterval(discussionTimer); goVote(); }
    },1000);
  });
}
function goVote(){ showConfirm("เริ่มโหวต?", ()=>{ if(discussionTimer) clearInterval(discussionTimer); votes={}; currentPage='vote'; voteIndex=0; render(); }); }

function castVote(name){
  showConfirm(`คุณต้องการโหวต ${name}?`, ()=>{
    votes[name] = (votes[name]||0)+1;
    voteIndex++;
    if(voteIndex < players.length){ currentPage='vote'; render(); }
    else finishVote();
  });
}

function finishVote(){
  let maxVote = -1, eliminated=null;
  for(const [p,c] of Object.entries(votes)){
    if(c>maxVote){ maxVote=c; eliminated=p; }
  }
  const role = assignedRoles[eliminated];
  if(role==='thief.PNG'){
    window._gameResultText = "✅ ถูกต้อง! จับหนูขโมยชีสได้ 🧀";
  } else if(role==='scapegoat.PNG'){
    window._gameResultText = "❌ ผิด! หนูรับเคราะห์ชนะ 🐭";
  } else {
    window._gameResultText = "❌ ผิด! หนูขโมยชีสชนะ 🧀";
  }
  currentPage='result'; render();
}

function restart(){ showConfirm("เริ่มใหม่?", ()=>{ cheeseStolen=false; roosterPlayed=false; currentPage='setup'; render(); }); }
function closeWindow(){ alert("ปิดแท็บเพื่อออกเกม"); }

// ---------- INIT ----------
goMenu();
