const CACHE_NAME="structureco-shell-f8d24b3b21b1def8";
const SHELL=["./assets/CommandPalette-DWeMaepV.js","./assets/InfluenceLineView-4_-ov-sn.js","./assets/ModelDoctor-B_s-eftz.css","./assets/ModelDoctor-D0VqmnT2.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2DxfAction-DTWJEe3I.js","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-C1D4donc.js","./assets/PortableImportCenter-BFSgLBSo.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/PwaUpdateNotice-CoytnlTl.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/Space3DWorkspace-DSk7lsIq.js","./assets/WorkspaceShell-ARK_kzBu.js","./assets/WorkspaceShell-chcfqH0G.css","./assets/analysis.worker-DGXEcNhh.js","./assets/arrow-left-84YSX5c3.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index--YtK6AzK.js","./assets/index-Chr-wyu1.css","./assets/influence.worker-BSqlB4fk.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-178D7S0d.js","./assets/motionFeatures-DCq4jblg.js","./assets/pDelta-Drj5cIE8.js","./assets/pdf-BaSzx6oH.js","./assets/pdf.worker-Dg_VPFYK.mjs","./assets/pdf.worker-HAhvYgAe.js","./assets/portable-bHtCn8-l.js","./assets/portableExportAnalysis-CkikZS2F.js","./assets/portableFile-D8H_qAx8.js","./assets/projectCommand--Xzih9uJ.js","./assets/projectRepository-CxRdy1E4.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-BT5F1kqK.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structureGeometry-BSUVrzQK.js","./assets/toolRegistry-BG2FCJb4.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/validationIssueTarget-BN1BYnEs.js","./assets/workerHandlers-CljsO7ad.js","./assets/workspaceCommands-G3iM6YtC.js","./assets/wrench-nM5Ty-5n.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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