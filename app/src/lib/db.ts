import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import {
  getDefaultCss,
  getDarkCss,
  getMinimalCss,
  getRetroGridTemplateCss,
  getFlickeringGridTemplateCss,
  getLetterGlitchTemplateCss,
  getDotGridTemplateCss,
  getGalaxyTemplateCss,
} from "./templates/default";
import { getTerminalTemplateCss } from "./templates/terminaltemplates";

const globalForDb = globalThis as unknown as {
  luminaDb?: Database.Database;
};

// ─── 動態背景 bgScript（自包含 IIFE，掛載至 #lcms-bg-canvas）──────────────────

const LETTER_GLITCH_SCRIPT = `(function(){
  var c=document.getElementById('lcms-bg-canvas');if(!c)return;
  var ctx=c.getContext('2d');
  var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789';
  var colors=['#2b4539','#61dca3','#61b3dc'];
  var cW=10,cH=20,letters=[],cols=0;
  function rnd(a){return a[Math.floor(Math.random()*a.length)];}
  function resize(){
    c.width=window.innerWidth;c.height=window.innerHeight;
    cols=Math.ceil(c.width/cW);var rows=Math.ceil(c.height/cH);
    letters=[];for(var i=0;i<cols*rows;i++)letters.push({ch:rnd(chars),co:rnd(colors)});
  }
  function draw(){
    ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);
    ctx.font='16px monospace';ctx.textBaseline='top';
    for(var i=0;i<letters.length;i++){
      ctx.fillStyle=letters[i].co;ctx.fillText(letters[i].ch,(i%cols)*cW,Math.floor(i/cols)*cH);
    }
    var g=ctx.createRadialGradient(c.width/2,c.height/2,0,c.width/2,c.height/2,Math.max(c.width,c.height)*0.7);
    g.addColorStop(0.6,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');
    ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  }
  var last=0;
  function animate(ts){
    if(ts-last>=50){
      var n=Math.max(1,letters.length*0.05|0);
      for(var i=0;i<n;i++){var idx=Math.random()*letters.length|0;letters[idx]={ch:rnd(chars),co:rnd(colors)};}
      draw();last=ts;
    }
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize',function(){resize();draw();});
  resize();draw();requestAnimationFrame(animate);
})();`;

const DOT_GRID_SCRIPT = `(function(){
  var c=document.getElementById('lcms-bg-canvas');if(!c)return;
  var ctx=c.getContext('2d');
  var dotR=2,gap=26,prox=120;
  var bColor='#271E37',aColor='#5227FF';
  var dots=[],mx=-9999,my=-9999;
  function hr(h){var m=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(h);return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:0,g:0,b:0};}
  var bRgb=hr(bColor),aRgb=hr(aColor);
  function resize(){
    c.width=window.innerWidth;c.height=window.innerHeight;dots=[];
    var cell=dotR*2+gap;
    for(var y=dotR+gap/2;y<c.height+cell;y+=cell)for(var x=dotR+gap/2;x<c.width+cell;x+=cell)dots.push({x:x,y:y});
  }
  function draw(){
    ctx.fillStyle='#0a0814';ctx.fillRect(0,0,c.width,c.height);
    for(var i=0;i<dots.length;i++){
      var d=dots[i];var dx=d.x-mx,dy=d.y-my,dist=Math.sqrt(dx*dx+dy*dy),style;
      if(dist<prox){var t=1-dist/prox;style='rgb('+Math.round(bRgb.r+(aRgb.r-bRgb.r)*t)+','+Math.round(bRgb.g+(aRgb.g-bRgb.g)*t)+','+Math.round(bRgb.b+(aRgb.b-bRgb.b)*t)+')';}
      else style=bColor;
      ctx.beginPath();ctx.arc(d.x,d.y,dotR,0,Math.PI*2);ctx.fillStyle=style;ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  window.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;});
  resize();draw();
})();`;

const GALAXY_SCRIPT = `(function(){
  var c=document.getElementById('lcms-bg-canvas');if(!c)return;
  var gl=c.getContext('webgl',{alpha:false,antialias:true})||c.getContext('experimental-webgl',{alpha:false,antialias:true});
  if(!gl){
    var ctx2=c.getContext('2d');if(!ctx2)return;
    c.width=window.innerWidth;c.height=window.innerHeight;
    ctx2.fillStyle='#000010';ctx2.fillRect(0,0,c.width,c.height);
    return;
  }
  gl.clearColor(0,0,0.06,1);
  var vs='attribute vec2 pos;attribute vec2 uv;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(pos,0,1);}';
  var fs=[
    'precision highp float;',
    'uniform float uTime;uniform vec3 uRes;uniform vec2 uFocal;uniform vec2 uRot;',
    'uniform float uSS;uniform float uDen;uniform float uHS;uniform float uSpd;',
    'uniform vec2 uMouse;uniform float uGlow;uniform float uSat;',
    'uniform float uTwink;uniform float uRotSpd;uniform float uActFac;',
    '#define NL 4.0',
    '#define M45 mat2(0.7071,-0.7071,0.7071,0.7071)',
    '#define PR 3.0',
    'float H(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float tri(float x){return abs(fract(x)*2.0-1.0);}',
    'float trs(float x){float t=fract(x);return 1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0));}',
    'float trn(float x){float t=fract(x);return 2.0*(1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0)))-1.0;}',
    'vec3 h2r(vec3 c){vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);}',
    'float Star(vec2 uv,float fl){float d=length(uv);float m=(0.05*uGlow)/d;float r=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));m+=r*fl*uGlow;uv*=M45;r=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));m+=r*0.3*fl*uGlow;m*=smoothstep(1.0,0.2,d);return m;}',
    'vec3 SL(vec2 uv){',
    '  vec3 col=vec3(0.0);vec2 gv=fract(uv)-0.5;vec2 id=floor(uv);',
    '  for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){',
    '    vec2 si=id+vec2(float(x),float(y));float s=H(si);float sz=fract(s*345.32);',
    '    float gl2=tri(uSS/(PR*s+1.0));float fl=smoothstep(0.9,1.0,sz)*gl2;',
    '    float red=smoothstep(0.2,1.0,H(si+1.0))+0.2;float blu=smoothstep(0.2,1.0,H(si+3.0))+0.2;',
    '    float grn=min(red,blu)*s;vec3 base=vec3(red,grn,blu);',
    '    float hue=atan(base.g-base.r,base.b-base.r)/(2.0*3.14159)+0.5;',
    '    hue=fract(hue+uHS/360.0);',
    '    float sat2=length(base-vec3(dot(base,vec3(0.299,0.587,0.114))))*uSat;',
    '    float val=max(max(base.r,base.g),base.b);base=h2r(vec3(hue,sat2,val));',
    '    vec2 pad=vec2(trs(s*34.0+uTime*uSpd/10.0),trs(s*38.0+uTime*uSpd/30.0))-0.5;',
    '    float star=Star(gv-vec2(float(x),float(y))-pad,fl);',
    '    float tw=trn(uTime*uSpd+s*6.2831)*0.5+1.0;tw=mix(1.0,tw,uTwink);',
    '    star*=tw;col+=star*sz*base;',
    '  }}return col;}',
    'void main(){',
    '  vec2 fp=uFocal*uRes.xy;',
    '  vec2 uv=(vUv*uRes.xy-fp)/uRes.y;',
    '  float ar=uTime*uRotSpd;',
    '  mat2 aRot=mat2(cos(ar),-sin(ar),sin(ar),cos(ar));',
    '  uv=aRot*uv;',
    '  uv=mat2(uRot.x,-uRot.y,uRot.y,uRot.x)*uv;',
    '  vec3 col=vec3(0.0);',
    '  for(float i=0.0;i<1.0;i+=1.0/NL){',
    '    float dep=fract(i+uSS*uSpd);',
    '    float sc=mix(20.0*uDen,0.5*uDen,dep);',
    '    float fade=dep*smoothstep(1.0,0.9,dep);',
    '    col+=SL(uv*sc+i*453.32)*fade;',
    '  }',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\\n');
  function mkShader(type,src){
    var s=gl.createShader(type);
    if(!s)return null;
    gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      console.warn('[Galaxy] shader error:',gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  var prog=gl.createProgram();
  if(!prog)return;
  var vShader=mkShader(gl.VERTEX_SHADER,vs);
  var fShader=mkShader(gl.FRAGMENT_SHADER,fs);
  if(!vShader||!fShader)return;
  gl.attachShader(prog,vShader);gl.attachShader(prog,fShader);
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){
    console.warn('[Galaxy] link error:',gl.getProgramInfoLog(prog));return;
  }
  gl.useProgram(prog);
  var posArr=new Float32Array([-1,-1,3,-1,-1,3]),uvArr=new Float32Array([0,0,2,0,0,2]);
  function bindBuf(data,attr){
    var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    var l=gl.getAttribLocation(prog,attr);
    if(l>=0){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);}
  }
  bindBuf(posArr,'pos');bindBuf(uvArr,'uv');
  var u={
    time:gl.getUniformLocation(prog,'uTime'),
    res:gl.getUniformLocation(prog,'uRes'),
    focal:gl.getUniformLocation(prog,'uFocal'),
    rot:gl.getUniformLocation(prog,'uRot'),
    ss:gl.getUniformLocation(prog,'uSS'),
    den:gl.getUniformLocation(prog,'uDen'),
    hs:gl.getUniformLocation(prog,'uHS'),
    spd:gl.getUniformLocation(prog,'uSpd'),
    mouse:gl.getUniformLocation(prog,'uMouse'),
    glow:gl.getUniformLocation(prog,'uGlow'),
    sat:gl.getUniformLocation(prog,'uSat'),
    twink:gl.getUniformLocation(prog,'uTwink'),
    rotspd:gl.getUniformLocation(prog,'uRotSpd'),
    actfac:gl.getUniformLocation(prog,'uActFac')
  };
  gl.uniform2f(u.focal,0.5,0.5);
  gl.uniform2f(u.rot,1,0);
  gl.uniform1f(u.den,1);
  gl.uniform1f(u.hs,140);
  gl.uniform1f(u.spd,1);
  gl.uniform1f(u.glow,0.3);
  gl.uniform1f(u.sat,0);
  gl.uniform1f(u.twink,0.3);
  gl.uniform1f(u.rotspd,0.1);
  gl.uniform1f(u.actfac,0);
  var mx=0.5,my=0.5,tmx=0.5,tmy=0.5,tact=0,sact=0;
  function resize(){
    c.width=window.innerWidth;c.height=window.innerHeight;
    gl.viewport(0,0,c.width,c.height);
    gl.uniform3f(u.res,c.width,c.height,c.width/c.height);
  }
  window.addEventListener('resize',resize);
  window.addEventListener('mousemove',function(e){
    tmx=e.clientX/window.innerWidth;
    tmy=1.0-e.clientY/window.innerHeight;
    tact=1;
  });
  resize();
  function animate(t){
    requestAnimationFrame(animate);
    var lf=0.05;
    mx+=(tmx-mx)*lf;my+=(tmy-my)*lf;sact+=(tact-sact)*lf;
    var ss=(t*0.001*0.5)/10.0;
    gl.uniform1f(u.time,t*0.001);
    gl.uniform1f(u.ss,ss);
    gl.uniform2f(u.mouse,mx,my);
    gl.uniform1f(u.actfac,sact);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  requestAnimationFrame(animate);
})();`;

// ─── 自動 Migration ────────────────────────────────────────────────────────────

function migrateDb(db: Database.Database) {
  // 為 Template 資料表增補新欄位（若已存在則略過）
  const alterCols = [
    "ALTER TABLE Template ADD COLUMN cssContent TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE Template ADD COLUMN configJson TEXT NOT NULL DEFAULT '{}'",
  ];
  for (const sql of alterCols) {
    try {
      db.exec(sql);
    } catch {
      // SQLite 不支援 ADD COLUMN IF NOT EXISTS，catch 代表欄位已存在
    }
  }

  // 為 Post 資料表增補發布狀態欄位（若已存在則略過）
  const alterPostCols = [
    "ALTER TABLE Post ADD COLUMN publishedUrl TEXT",
    "ALTER TABLE Post ADD COLUMN publishedAt TEXT",
  ];
  for (const sql of alterPostCols) {
    try {
      db.exec(sql);
    } catch {
      // 同上：欄位已存在就略過
    }
  }

  // 內建模板定義
  const builtIn = [
    {
      name: "default",
      displayName: "預設 Apple 風格",
      description: "簡潔 Apple 設計語言，白色卡片 + 毛玻璃導覽列",
      preview: "#F5F5F7",
      getCss: getDefaultCss,
    },
    {
      name: "dark",
      displayName: "深色模式",
      description: "暗黑系版面，高對比色調，適合夜間閱讀",
      preview: "#1c1c1e",
      getCss: getDarkCss,
    },
    {
      name: "minimal",
      displayName: "極簡閱讀",
      description: "純白 serif 字體版面，去除裝飾，聚焦長文閱讀",
      preview: "#ffffff",
      getCss: getMinimalCss,
    },
    {
      name: "retrogrid",
      displayName: "背景 · RetroGrid",
      description: "深色科幻感 RetroGrid（純 CSS 背景），適合科技/作品集風格",
      preview: "#070a0f",
      getCss: getRetroGridTemplateCss,
    },
    {
      name: "flickergrid",
      displayName: "背景 · FlickeringGrid",
      description: "輕量點陣閃爍背景（純 CSS），適合清爽資訊版面",
      preview: "#ffffff",
      getCss: getFlickeringGridTemplateCss,
    },
    {
      name: "terminal",
      displayName: "背景 · Terminal",
      description: "終端機風格（暗色、掃描線、綠色重點），適合技術文章",
      preview: "#070a0f",
      getCss: getTerminalTemplateCss,
    },
    {
      name: "letterglitch",
      displayName: "背景 · LetterGlitch",
      description: "黑色底 Canvas 字元故障動畫，科幻感十足",
      preview: "#000000",
      getCss: getLetterGlitchTemplateCss,
      bgScript: LETTER_GLITCH_SCRIPT,
    },
    {
      name: "dotgrid",
      displayName: "背景 · DotGrid",
      description: "深紫色點陣背景，游標接近時點亮紫光，互動感強烈",
      preview: "#0a0814",
      getCss: getDotGridTemplateCss,
      bgScript: DOT_GRID_SCRIPT,
    },
    {
      name: "galaxy",
      displayName: "背景 · Galaxy",
      description: "WebGL 星系動畫，滑鼠互動排斥星場，深邃宇宙氛圍",
      preview: "#000010",
      getCss: getGalaxyTemplateCss,
      bgScript: GALAXY_SCRIPT,
    },
  ] satisfies { name: string; displayName: string; description: string; preview: string; getCss: () => string; bgScript?: string }[];

  const insertTemplate = db.prepare(
    "INSERT INTO Template (id, name, cssContent, configJson) VALUES (?, ?, ?, ?)",
  );
  const updateTemplate = db.prepare(
    "UPDATE Template SET cssContent = ?, configJson = ? WHERE id = ?",
  );

  // 移除已棄用的內建模板（避免在模板選單中殘留）
  try {
    db.prepare("DELETE FROM Template WHERE name = ?").run("ripple");
  } catch {
    // ignore
  }

  for (const t of builtIn) {
    const existing = db
      .prepare("SELECT id, cssContent FROM Template WHERE name = ? LIMIT 1")
      .get(t.name) as { id: string; cssContent: string } | undefined;

    const configJson = JSON.stringify({
      displayName: t.displayName,
      description: t.description,
      preview: t.preview,
      bgScript: "bgScript" in t ? t.bgScript : "",
    });
    const cssContent = t.getCss();

    if (!existing) {
      insertTemplate.run(randomUUID(), t.name, cssContent, configJson);
    } else {
      // 內建模板：每次啟動都同步最新 CSS/Config（避免 dev.db 內殘留舊資料導致看不到背景）
      updateTemplate.run(cssContent, configJson, existing.id);
    }
  }
}

// ─── 建立連線 ──────────────────────────────────────────────────────────────────

function createDb() {
  const dbPath = path.join(process.cwd(), "dev.db");
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  migrateDb(db);
  return db;
}

export const db: Database.Database =
  globalForDb.luminaDb ?? createDb();

// 即使在 dev hot-reload 重用同一個 db instance，也確保 migration / 內建模板同步會被執行
try {
  migrateDb(db);
} catch {
  // ignore
}

if (!globalForDb.luminaDb) globalForDb.luminaDb = db;
