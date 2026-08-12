const CACHE_NAME="structureco-shell-2e3063931d4ac621";
const SHELL=["./assets/CommandPalette-9k9_M5Nd.js","./assets/InfluenceLineView-CKItyUhc.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2DxfAction-DWHMT3DL.js","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-BXnLktYR.js","./assets/PortableImportCenter-BEFpa2dS.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/PwaUpdateNotice-D4MuXESr.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/Space3DWorkspace-DeUDcj6n.js","./assets/WorkspaceShell-BghFqkZk.js","./assets/WorkspaceShell-DP9fagG9.css","./assets/analysis.worker-rhYQcvJj.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-Chr-wyu1.css","./assets/index-CnkyzmqQ.js","./assets/influence.worker-CMvCtPEs.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-178D7S0d.js","./assets/motionFeatures-DUi3tUVl.js","./assets/pDelta-CeDj9jZ8.js","./assets/pdf-rtIvpWUX.js","./assets/pdf.worker-Dg_VPFYK.mjs","./assets/pdf.worker-HAhvYgAe.js","./assets/portable-CCRrxA9X.js","./assets/portableExportAnalysis-C2b9M7pm.js","./assets/portableFile-Dj2d1BfN.js","./assets/projectCommand-D4GJTiYp.js","./assets/projectRepository-Bh9jIPGr.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-C6G_IK27.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structureGeometry-BSUVrzQK.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-ByRDcQeQ.js","./assets/workspaceCommands-CKZWJszx.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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