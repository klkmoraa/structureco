const CACHE_NAME="structureco-shell-f29aa214f22ef34f";
const SHELL=["./assets/CommandPalette-B_mbxfLo.js","./assets/InfluenceLineView-SVFGdSR_.js","./assets/ModelDoctor-B_s-eftz.css","./assets/ModelDoctor-U0kBAx4V.js","./assets/Phase2DxfAction-BF-IVIyV.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-DAQuK-h-.js","./assets/PortableImportCenter-DSicU0mi.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/PwaUpdateNotice-BvoS9gW1.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/Space3DWorkspace-DiaG6ibt.js","./assets/WorkspaceShell-C1y-ML7N.css","./assets/WorkspaceShell-DmRVUNhq.js","./assets/analysis.worker-DGXEcNhh.js","./assets/arrow-left-84YSX5c3.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-Ce5i3DgL.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-BL3H2s_d.js","./assets/index-CgAllxWl.css","./assets/influence.worker-BSqlB4fk.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-178D7S0d.js","./assets/modelDoctorDiagnostics-DeSk88Em.js","./assets/motionFeatures-I9yvVywk.js","./assets/pDelta-BvEXra4I.js","./assets/pdf-WQCCrget.js","./assets/pdf.worker-Dg_VPFYK.mjs","./assets/pdf.worker-HAhvYgAe.js","./assets/portable-0-oqZu6p.js","./assets/portableExportAnalysis-DYMA5fqQ.js","./assets/portableFile-C_RHSilO.js","./assets/projectCommand-BVuLOVnm.js","./assets/projectRepository-DCAgmkM-.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-BT5F1kqK.js","./assets/shield-alert-RwGFML0-.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structuralEditing-BW6fgLMk.js","./assets/structureGeometry-BSUVrzQK.js","./assets/toolRegistry-BG2FCJb4.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-DWYxidEU.js","./assets/workspaceCommands-uKUB-Yb6.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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