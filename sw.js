const CACHE_NAME="structureco-shell-cfff7b519a57f12b";
const SHELL=["./assets/CommandPalette-DtZulkoV.js","./assets/InfluenceLineView-BzGVcHN7.js","./assets/ModelDoctor-B_s-eftz.css","./assets/ModelDoctor-KbH0oe_-.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2DxfAction-HyUpZasm.js","./assets/Phase2ProjectHub-B9uSPOzx.css","./assets/Phase2ProjectHub-UeN6dbD7.js","./assets/PortableImportCenter-DlKtWaCz.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/PwaUpdateNotice-CPwXJ0TK.js","./assets/Space3DWorkspace-C63BzSaN.css","./assets/Space3DWorkspace-DElsDZjF.js","./assets/WorkspaceShell-AfKzuGx-.js","./assets/WorkspaceShell-BSxhSlFt.css","./assets/analysis.worker-DGXEcNhh.js","./assets/arrow-left-84YSX5c3.js","./assets/browser-DEYugRT4.js","./assets/check-TtOjy2VR.js","./assets/controls-BwANQUmD.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-CgAllxWl.css","./assets/index-DOEyFS3h.js","./assets/influence.worker-BSqlB4fk.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/math-B9PrbyNy.js","./assets/migrate-178D7S0d.js","./assets/modelDoctorDiagnostics-uM6iiL1y.js","./assets/motionFeatures-C0pXzC9a.js","./assets/pDelta-Diub5tqR.js","./assets/pdf-hUYOfhx3.js","./assets/pdf.worker-Dg_VPFYK.mjs","./assets/pdf.worker-HAhvYgAe.js","./assets/portable-DLVck_YQ.js","./assets/portableExportAnalysis-BXTfvB4U.js","./assets/portableFile-BQS7gx1R.js","./assets/projectCommand-DP2dSEI7.js","./assets/projectRepository-m5yw2AJ8.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-BT5F1kqK.js","./assets/shield-alert-RwGFML0-.js","./assets/shield-check-BzmKnplT.js","./assets/space3d.worker-BPyTSpGZ.js","./assets/structuralEditing-BwV4WTBF.js","./assets/structureGeometry-BSUVrzQK.js","./assets/toolRegistry-BG2FCJb4.js","./assets/triangle-alert-D_MQgJqe.js","./assets/undo-2-BUa56Y_Z.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-D1b7d0C-.js","./assets/workspaceCommands-uKUB-Yb6.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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