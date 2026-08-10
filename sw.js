const CACHE_NAME="structureco-shell-5dc774d7fb7510e9";
const SHELL=["./assets/CommandPalette-BdjN9pRd.js","./assets/InfluenceLineView-BJ7UTl-O.js","./assets/Phase2DxfAction-C8GjA6vB.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-D7KkHBsg.js","./assets/PortableImportCenter-CfprMWfJ.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/PwaUpdateNotice-DkdJgd_T.js","./assets/Space3DWorkspace-B4gxhgm_.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/WorkspaceShell-BA6F_-RC.css","./assets/WorkspaceShell-C0DCCtfq.js","./assets/analysis.worker-rhYQcvJj.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-2ed3KRPu.js","./assets/index-BXvXcXP7.css","./assets/influence.worker-CMvCtPEs.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-BptNUrTT.js","./assets/motionFeatures-aOzVUffd.js","./assets/pDelta-Cfdcnf4_.js","./assets/pdf-7B57_8cz.js","./assets/pdf.worker-BASQQs-o.mjs","./assets/pdf.worker-BNprRpH7.js","./assets/portable-BC3jq39n.js","./assets/portableExportAnalysis-4LEzywcx.js","./assets/portableFile-Vwb9B1tS.js","./assets/projectCommand-CKv6Ue-w.js","./assets/projectRepository-FS1gGTUN.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-C6G_IK27.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structureGeometry-BSUVrzQK.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-CpHQVXTI.js","./assets/workspaceCommands-CKZWJszx.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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