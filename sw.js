const CACHE_NAME="structureco-shell-87d52541a2ec7c6e";
const SHELL=["./assets/CommandPalette-D_DONuSH.js","./assets/InfluenceLineView-CVs_SKpC.js","./assets/Phase2DxfAction-Bh-rBYex.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-BnHxegy_.js","./assets/PortableImportCenter-B8gVydrx.js","./assets/PwaUpdateNotice-Bd7rXy2M.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/Space3DWorkspace-B3kH3o2J.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/WorkspaceShell-Drb75-tl.css","./assets/WorkspaceShell-p6pttudU.js","./assets/analysis.worker-rhYQcvJj.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-BKyeTQ1_.js","./assets/index-BfIsWE5M.css","./assets/influence.worker-CMvCtPEs.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-BptNUrTT.js","./assets/motionFeatures-Zz6DhCCe.js","./assets/pDelta-B24eplex.js","./assets/pdf-6D7t3JXm.js","./assets/pdf.worker-Dg_VPFYK.mjs","./assets/pdf.worker-HAhvYgAe.js","./assets/portable-CXciIQCO.js","./assets/portableExportAnalysis-CoAx9PeE.js","./assets/portableFile-CeYqOx-i.js","./assets/projectCommand-Ckk9KGwc.js","./assets/projectRepository-C2oYvaFf.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-C6G_IK27.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structureGeometry-BSUVrzQK.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-DBMDUW9V.js","./assets/workspaceCommands-CKZWJszx.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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