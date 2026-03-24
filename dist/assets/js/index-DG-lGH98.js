import{r as pe,R as A,s as Re,aH as Se,bP as _e,a5 as Pe,t as re,v as D,J as _,P as R,y as o,H as Te,bo as Be,aO as Fe,aP as Ae,an as f,K as ge,z as We,bj as ze,ao as N,g as Xe}from"./vue-vendor-t3ds67KK.js";import{j as Ye}from"./index-D99Bbdwk.js";const Oe={class:"canvas-wrapper"},He={class:"canvas-header"},Ee={class:"canvas-header-right"},Ue={class:"canvas-layout"},Ie={class:"canvas-desc"},$e={class:"tab-desc"},qe={key:0,class:"tab-text tab-warn"},Le={key:1,class:"tab-text"},p=18,me=8,se=.03/16,Ve="#409EFF",je="rgba(64, 158, 255, 0.45)",Ne=pe({name:"UseCanvas",__name:"useCanvas",setup(ve){const S=A("dirty"),F=A(0),W=A({dotCount:0,naiveBeginCalls:0,naiveFillCalls:0,naiveStrokeCalls:0,optimizedBeginCalls:0,optimizedFillCalls:0,optimizedStrokeCalls:0}),E=A(null),z=A(null),U=A(null),I=A(null);let M=null,e=null,m=null,b=null,u=0,h=0,k=1,i=600,c=360,oe=null;const ne=p+me,ie=ne*2,X=Math.PI*2;let v=0,P=0,T=0,C=100,x=0,B=0,G=null,w=null,$=!1;const he=Re(()=>({dirty:"减少重绘范围",layer:"分层渲染",callCost:"降低调用成本",worker:"Worker + OffscreenCanvas"})[S.value]),xe=typeof OffscreenCanvas<"u",ce=typeof Worker<"u";function q(s,t,r){return Math.min(r,Math.max(t,s))}function ye(){const s=E.value;if(!s)return{w:600,h:360};const t=Math.max(320,Math.floor(s.clientWidth||600)),r=Math.max(240,Math.floor(s.clientHeight||360));return{w:t,h:r}}function Y(s,t){const{w:r,h:a}=ye();i=r,c=a,k=window.devicePixelRatio||1,G=null,s.width=Math.floor(i*k),s.height=Math.floor(c*k),t.setTransform(k,0,0,k,0,0)}function de(){if(!M||!z.value)return;const s=Math.floor(i*k),t=Math.floor(c*k),r=xe?new OffscreenCanvas(s,t):(()=>{const n=document.createElement("canvas");return n.width=s,n.height=t,n})(),a=r.getContext("2d");if(!a)return;a.setTransform(k,0,0,k,0,0);const l=a.createLinearGradient(0,0,i,c);l.addColorStop(0,"#f5f7ff"),l.addColorStop(1,"#e9f0ff"),a.fillStyle=l,a.fillRect(0,0,i,c),a.strokeStyle="#d0d7ff",a.lineWidth=.5;const d=20;a.beginPath();for(let n=0;n<=i;n+=d)a.moveTo(n,0),a.lineTo(n,c);for(let n=0;n<=c;n+=d)a.moveTo(0,n),a.lineTo(i,n);a.stroke(),a.fillStyle="#333",a.font='16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',a.fillText("Canvas 性能优化示例",20,30),a.fillStyle="#666",a.font='12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',a.fillText("五种模式对比：切 Tab 查看差异",20,52),oe=r,M.clearRect(0,0,i,c),M.drawImage(oe,0,0,s,t,0,0,i,c)}function J(){M&&(M.globalCompositeOperation="source-over"),e&&e.clearRect(0,0,i,c),m&&m.clearRect(0,0,i,c),h=0,u=0,F.value=0}function fe(s,t,r,a,l){const d=i,n=c,g=Math.min(s,r)-l,Q=Math.min(t,a)-l,y=Math.max(s,r)+l,Z=Math.max(t,a)+l,j=q(g,0,d),ee=q(Q,0,n),O=q(y,0,d),H=q(Z,0,n),te=Math.max(0,O-j),ae=Math.max(0,H-ee);return{x:j,y:ee,width:te,height:ae}}function K(){e&&(e.globalCompositeOperation="source-over",e.shadowBlur=0,e.shadowColor="transparent",e.fillStyle=Ve,e.strokeStyle=je,e.lineWidth=3,e.lineCap="round")}function L(){b&&cancelAnimationFrame(b),b=null,v=0,P=0,T=0,w&&(w.terminate(),w=null),$=!1}function be(){L(),J(),K(),x=i/2,B=c/2,C=Math.min(i,c)*.28,v=0,P=x+C*Math.cos(v),T=B+C*Math.sin(v);const s=t=>{if(!e)return;u||(u=t);const r=Math.max(.1,t-u);u=t;const a=v+se*r,l=x+C*Math.cos(a),d=B+C*Math.sin(a),n=fe(P,T,l,d,p+6),g=n.width>0&&n.height>0;g&&e.clearRect(n.x,n.y,n.width,n.height),g?(e.save(),e.beginPath(),e.rect(n.x,n.y,n.width,n.height),e.clip(),e.beginPath(),e.arc(l,d,p,0,X),e.fill(),e.stroke(),e.restore()):(e.beginPath(),e.arc(l,d,p,0,X),e.fill(),e.stroke()),P=l,T=d,v=a,h++,h%2===0&&(F.value=Math.round(1e3/r)),b=requestAnimationFrame(s)};b=requestAnimationFrame(s)}function Ce(){L(),J(),K(),x=i/2,B=c/2,C=Math.min(i,c)*.28,v=0,P=x+C,T=B,m&&(m.strokeStyle="rgba(64, 158, 255, 0.16)",m.lineWidth=2,m.lineCap="round");const s=t=>{if(!e||!m)return;u||(u=t);const r=Math.max(.1,t-u);u=t;const a=v+se*r,l=x+C*Math.cos(a),d=B+C*Math.sin(a),n=fe(P,T,l,d,p+6);e.clearRect(n.x,n.y,n.width,n.height),e.beginPath(),e.arc(l,d,p,0,X),e.fill(),e.stroke(),m.beginPath(),m.moveTo(P,T),m.lineTo(l,d),m.stroke(),h++,h%240===0&&m.clearRect(0,0,i,c),P=l,T=d,v=a,h%2===0&&(F.value=Math.round(1e3/r)),b=requestAnimationFrame(s)};b=requestAnimationFrame(s)}function Me(){if(L(),J(),K(),!e)return;h=0,u=0;const s=c/2;x=i/2;const t=Math.max(420,Math.floor(i*c/900)),r=q(i/240,1.4,3.4),a=Math.min(i,c)*.28,l=Math.min(i,c)*.12,d=new Float32Array(t),n=new Float32Array(t);for(let y=0;y<t;y++)d[y]=y/t*X,n[y]=.55+.45*Math.sin(y*.37);W.value={dotCount:t,naiveBeginCalls:0,naiveFillCalls:0,naiveStrokeCalls:0,optimizedBeginCalls:1,optimizedFillCalls:1,optimizedStrokeCalls:1};const g=e.createRadialGradient(x,s,0,x,s,Math.max(i,c)*.65);g.addColorStop(0,"rgba(123, 200, 255, 0.95)"),g.addColorStop(1,"rgba(64, 158, 255, 0.15)"),e.globalCompositeOperation="lighter",e.fillStyle=g,e.strokeStyle="rgba(64, 158, 255, 0.28)",e.lineWidth=Math.max(1,r*.6),e.shadowBlur=10,e.shadowColor="rgba(64, 158, 255, 0.25)",v=0;const Q=y=>{if(!e)return;u||(u=y);const Z=Math.max(.1,y-u);u=y;const j=v+se*Z,ee=j;e.clearRect(0,0,i,c),e.beginPath();for(let O=0;O<t;O++){const H=d[O]+ee,te=n[O],ae=x+a*Math.cos(H)+l*te*Math.cos(H*3.1),ue=s+a*Math.sin(H)+l*te*Math.sin(H*2.3);e.moveTo(ae+r,ue),e.arc(ae,ue,r,0,X)}e.fill(),e.stroke(),h%30===0&&(e.save(),e.globalCompositeOperation="source-over",e.shadowBlur=0,e.fillStyle="rgba(10, 18, 40, 0.6)",e.font='12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',e.fillText("Batch draw: 1x fill + 1x stroke",14,18),e.restore()),h++,h%2===0&&(F.value=Math.round(1e3/Z)),v=j,b=requestAnimationFrame(Q)};b=requestAnimationFrame(Q)}function ke(){const s=`
    let angle = 0;
    let prevX = 0;
    let prevY = 0;
    let speedRadPerMs = 0.0018;

    let r = 18;
    let spritePadding = 8;
    let spriteHalfCss = r + spritePadding;
    let spriteSizeCss = spriteHalfCss * 2;
    let dpr = 1;
    let orbitRadius = 100;
    let centerX = 0;
    let centerY = 0;

    function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

    async function buildSprite() {
      const spriteSizePx = Math.ceil(spriteSizeCss * dpr);
      const canvas = new OffscreenCanvas(spriteSizePx, spriteSizePx);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('OffscreenCanvas ctx not available');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = spriteHalfCss;
      const cy = spriteHalfCss;

      // shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + ${p} * 0.85, ${p} * 0.9, ${p} * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const fill = '#409EFF';
      const stroke = 'rgba(64, 158, 255, 0.45)';
      const TAU = Math.PI * 2;
      const grad = ctx.createRadialGradient(cx - ${p} * 0.3, cy - ${p} * 0.3, 0, cx, cy, ${p} * 1.4);
      grad.addColorStop(0, '#6bb7ff');
      grad.addColorStop(1, fill);
      ctx.fillStyle = grad;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(cx, cy, ${p}, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // glow ring
      ctx.strokeStyle = 'rgba(64, 158, 255, 0.18)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, ${p} + 3, 0, TAU);
      ctx.stroke();

      let bitmap = null;
      if (typeof canvas.transferToImageBitmap === 'function') {
        bitmap = canvas.transferToImageBitmap();
      } else {
        const blob = await canvas.convertToBlob();
        bitmap = await createImageBitmap(blob);
      }
      return bitmap;
    }

    let spriteBitmap = null;

    self.onmessage = async (e) => {
      const msg = e.data || {};
      try {
        if (msg.type === 'init') {
          speedRadPerMs = msg.speedRadPerMs || 0.0018;
          r = msg.r || 18;
          spritePadding = msg.spritePadding || 8;
          spriteHalfCss = r + spritePadding;
          spriteSizeCss = spriteHalfCss * 2;
          dpr = msg.dpr || 1;
          orbitRadius = msg.orbitRadius || 100;
          centerX = msg.centerX || 0;
          centerY = msg.centerY || 0;

          angle = 0;
          prevX = centerX + orbitRadius * Math.cos(angle);
          prevY = centerY + orbitRadius * Math.sin(angle);

          spriteBitmap = await buildSprite();
          self.postMessage({ type: 'sprite', bitmap: spriteBitmap }, [spriteBitmap]);
          return;
        }

        if (msg.type === 'tick') {
          const dt = Math.max(0.1, msg.dt || 16);
          const nextAngle = angle + speedRadPerMs * dt;
          const x = centerX + orbitRadius * Math.cos(nextAngle);
          const y = centerY + orbitRadius * Math.sin(nextAngle);

          const padding = (r + spritePadding) + 2;
          const minX = Math.min(prevX, x) - padding;
          const minY = Math.min(prevY, y) - padding;
          const maxX = Math.max(prevX, x) + padding;
          const maxY = Math.max(prevY, y) + padding;

          const xx = clamp(minX, 0, msg.maxW);
          const yy = clamp(minY, 0, msg.maxH);
          const width = clamp(maxX - minX, 0, msg.maxW);
          const height = clamp(maxY - minY, 0, msg.maxH);

          self.postMessage({
            type: 'frame',
            x,
            y,
            dirtyRect: { x: xx, y: yy, width, height },
          });

          prevX = x;
          prevY = y;
          angle = nextAngle;
        }
      } catch (err) {
        self.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    };
  `,t=new Blob([s],{type:"text/javascript"}),r=URL.createObjectURL(t),a=new Worker(r);return URL.revokeObjectURL(r),a}async function we(){if(L(),J(),K(),x=i/2,B=c/2,C=Math.min(i,c)*.28,v=0,!ce)return;w&&w.terminate(),w=ke(),$=!1;let s=null,t=!1;w.onmessage=a=>{const l=a.data||{};if(l.type==="sprite"){G=l.bitmap,$=!0,t=!1;return}if(l.type==="error"){l.message;return}l.type==="frame"&&(s={x:l.x,y:l.y,dirtyRect:l.dirtyRect},t=!1)},w.postMessage({type:"init",r:p,spritePadding:me,dpr:k,orbitRadius:C,centerX:x,centerY:B,speedRadPerMs:se});const r=a=>{if(!e||!w)return;u||(u=a);const l=Math.max(.1,a-u);if(u=a,$&&!t&&(t=!0,w.postMessage({type:"tick",dt:l,maxW:i,maxH:c})),s){const{x:d,y:n,dirtyRect:g}=s;e.clearRect(g.x,g.y,g.width,g.height),$&&G?e.drawImage(G,d-ne,n-ne,ie,ie):(e.beginPath(),e.arc(d,n,p,0,X),e.fill(),e.stroke()),h++,h%2===0&&(F.value=Math.round(1e3/l)),s=null}b=requestAnimationFrame(r)};b=requestAnimationFrame(r)}function le(s){s==="dirty"&&be(),s==="layer"&&Ce(),s==="callCost"&&Me(),s==="worker"&&we().catch(()=>{})}let V=null;return Se(()=>{if(!z.value||!U.value||!I.value)return;const s=z.value,t=U.value,r=I.value;M=s.getContext("2d"),e=t.getContext("2d"),m=r.getContext("2d"),!(!M||!e||!m)&&(Y(s,M),Y(t,e),Y(r,m),de(),le(S.value),V=new ResizeObserver(()=>{!z.value||!U.value||!I.value||!M||!e||!m||(Y(z.value,M),Y(U.value,e),Y(I.value,m),de(),le(S.value))}),V.observe(E.value))}),_e(()=>{L(),V&&E.value&&V.unobserve(E.value),V=null}),Pe(S,s=>{le(s)}),(s,t)=>{const r=ze,a=Be,l=Ae,d=Fe,n=Xe;return D(),re("div",Oe,[_(n,{shadow:"hover",class:"canvas-card"},{header:R(()=>[o("div",He,[t[1]||(t[1]=o("span",null,"Canvas 性能优化示例（Tab 模式演示）",-1)),o("div",Ee,[_(r,{type:"success"},{default:R(()=>[f("FPS: "+N(F.value),1)]),_:1}),_(r,null,{default:R(()=>[f(N(he.value),1)]),_:1}),S.value==="callCost"?(D(),ge(r,{key:0},{default:R(()=>[f(" Batch fill/stroke: "+N(W.value.optimizedFillCalls)+"/"+N(W.value.optimizedStrokeCalls)+" · dots: "+N(W.value.dotCount),1)]),_:1})):We("",!0)])])]),default:R(()=>[o("div",Ue,[o("div",{ref_key:"containerRef",ref:E,class:"canvas-area"},[o("canvas",{ref_key:"bgCanvasRef",ref:z,class:"canvas-layer canvas-layer--bg"},null,512),o("canvas",{ref_key:"fgCanvasRef",ref:U,class:"canvas-layer canvas-layer--fg"},null,512),o("canvas",{ref_key:"trailCanvasRef",ref:I,class:"canvas-layer canvas-layer--trail",style:Te({opacity:S.value==="layer"?1:0})},null,4)],512),o("div",Ie,[_(a,{title:"切换 Tab：动态绘制策略会同步切换。",type:"info",closable:!1,"show-icon":""}),_(d,{modelValue:S.value,"onUpdate:modelValue":t[0]||(t[0]=g=>S.value=g),class:"canvas-tabs",type:"card"},{default:R(()=>[_(l,{label:"减少重绘范围",name:"dirty"},{default:R(()=>t[2]||(t[2]=[o("div",{class:"tab-desc"},[o("div",{class:"tab-title"},"脏矩形重绘 + 避免整屏 clear"),o("div",{class:"tab-text"},[f(" 仅根据“上一帧”和“当前帧”的小球覆盖范围计算 "),o("code",null,"dirtyRect"),f(" ，然后在前景层调用 "),o("code",null,"clearRect"),f(" 只清理局部区域；绘制阶段再用 "),o("code",null,"clip()"),f(" 限制在脏矩形内，避免笔触抗锯齿溢出。 背景仍保持静态离屏缓存。 ")])],-1)])),_:1}),_(l,{label:"分层渲染",name:"layer"},{default:R(()=>t[3]||(t[3]=[o("div",{class:"tab-desc"},[o("div",{class:"tab-title"},"静态背景 + 增量轨迹 + 前景局部擦除"),o("div",{class:"tab-text"},[f(" 背景在 "),o("code",null,"bg"),f(" 层一次性缓存；轨迹在 "),o("code",null,"trail"),f(" 层做“增量线段叠加”（不整层重绘）；小球高亮只在 "),o("code",null,"fg"),f(" 层做脏矩形清理与重绘。 ")])],-1)])),_:1}),_(l,{label:"降低调用成本",name:"callCost"},{default:R(()=>t[4]||(t[4]=[o("div",{class:"tab-desc"},[o("div",{class:"tab-title"},"合并路径批量绘制（只显示优化版）"),o("div",{class:"tab-text"},[f(" 使用“只设置一次样式 + 所有 "),o("code",null,"arc"),f(" 合并到一个路径里”，每帧只做一次 "),o("code",null,"fill"),f(" 和一次 "),o("code",null,"stroke"),f(" 。 同时用渐变 + 光晕来凸显批量绘制效果。 ")])],-1)])),_:1}),_(l,{label:"Worker + OffscreenCanvas",name:"worker"},{default:R(()=>[o("div",$e,[t[7]||(t[7]=o("div",{class:"tab-title"},"把计算与离屏渲染搬到 Worker",-1)),ce?(D(),re("div",Le,t[6]||(t[6]=[f(" 在 Worker 中更新角度、计算 "),o("code",null,"dirtyRect",-1),f(" ，并用 "),o("code",null,"OffscreenCanvas",-1),f(" 预生成精灵； 主线程只负责：接收结果、局部清理、把精灵绘制到前景层。 ")]))):(D(),re("div",qe,t[5]||(t[5]=[f(" 当前环境不支持 "),o("code",null,"Worker",-1),f(" ，该模式不可用。 ")])))])]),_:1})]),_:1},8,["modelValue"])])])]),_:1})])}}}),De=Ye(Ne,[["__scopeId","data-v-e7d16d52"]]),Ke=pe({name:"personal-content_canvas-optimization",__name:"index",setup(ve){return(S,F)=>{const W=De;return D(),ge(W)}}});export{Ke as default};
