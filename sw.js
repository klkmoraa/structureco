const CACHE_NAME="structureco-shell-ed942adc3fa0ac75";
const SHELL=["./assets/CommandPalette-Bkru6GT3.js","./assets/InfluenceLineView-Bjg44MEN.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2DxfAction-CkHFKYre.js","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-xhF4_cgP.js","./assets/PortableImportCenter-CCgn6Yui.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/PwaUpdateNotice-Dwv8o-rP.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/Space3DWorkspace-DOEV44RJ.js","./assets/WorkspaceShell-BaTkIDgT.js","./assets/WorkspaceShell-N7YIYi9b.css","./assets/analysis.worker-rhYQcvJj.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-ChYdPwZI.css","./assets/index-ERM2nbSk.js","./assets/influence.worker-CMvCtPEs.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-BptNUrTT.js","./assets/motionFeatures-Bu6CgBoG.js","./assets/pDelta-92xSzzNq.js","./assets/pdf-BbHA2Apj.js","./assets/pdf.worker-BASQQs-o.mjs","./assets/pdf.worker-BNprRpH7.js","./assets/portable-Ch08Rogo.js","./assets/portableExportAnalysis-DdDQwPsQ.js","./assets/portableFile-BglGwO2H.js","./assets/projectCommand-BqFvFBsx.js","./assets/projectRepository-Ox4-6OMp.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-C6G_IK27.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structureGeometry-BSUVrzQK.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-nUtIOL85.js","./assets/workspaceCommands-CKZWJszx.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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