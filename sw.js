const CACHE_NAME="structureco-shell-806aab9686f38114";
const SHELL=["./assets/InfluenceLineView-sQAFbRHs.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2DxfAction-VwybSHLV.js","./assets/Phase2ProjectHub-Cu10D_T-.css","./assets/Phase2ProjectHub-DK6j58Yt.js","./assets/PortableImportCenter-pgaLx6Xv.js","./assets/PwaUpdateNotice-7tqlm8VC.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/Space3DWorkspace-6xePN_pC.css","./assets/Space3DWorkspace-Ci5ea94w.js","./assets/WorkspaceShell-BsQ8592K.js","./assets/WorkspaceShell-kIKzFJ9D.css","./assets/analysis.worker-rhYQcvJj.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-BmVH08X8.js","./assets/index-CXwlRUrE.css","./assets/influence.worker-CMvCtPEs.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-BptNUrTT.js","./assets/motionFeatures-CUia2d_D.js","./assets/pDelta-C5I-7-Ab.js","./assets/pdf-AGzeHiGM.js","./assets/pdf.worker-BASQQs-o.mjs","./assets/pdf.worker-BNprRpH7.js","./assets/portable-DS76knQY.js","./assets/portableExportAnalysis-DhWvyKE_.js","./assets/portableFile-BMxQZycO.js","./assets/projectCommand-IznoX0KK.js","./assets/projectRepository-B0AnCVKL.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-C6G_IK27.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structureGeometry-CrKtXZJr.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BR_cwU3i.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-CaiRFRBl.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',response.clone())));
      return response;
    }).catch(async()=>await caches.match('./index.html',{ignoreVary:true})||await caches.match('./',{ignoreVary:true})));
    return;
  }
  event.respondWith(caches.match(request,{ignoreVary:true}).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok)event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone())));
    return response;
  })));
});