const CACHE_NAME="structureco-shell-99535c4ab0273d16";
const SHELL=["./assets/Experimental3DView-BU1T8Lp7.css","./assets/Experimental3DView-D9vzMCJN.js","./assets/InfluenceLineView-D6FSs81S.js","./assets/Phase2DxfAction-BmTZTvyU.js","./assets/Phase2DxfAction-CTC8C-Q0.css","./assets/Phase2ProjectHub-BQKtMwvr.js","./assets/Phase2ProjectHub-Cu10D_T-.css","./assets/PortableImportCenter-Bz-RcS9G.js","./assets/PwaUpdateNotice-BIIB_2t9.js","./assets/PwaUpdateNotice-Bl8tvzjR.css","./assets/WorkspaceShell-CJkEOSAI.js","./assets/WorkspaceShell-kIKzFJ9D.css","./assets/analysis.worker-rhYQcvJj.js","./assets/browser-DEYugRT4.js","./assets/controls-DEg3ppxt.js","./assets/copy-DYQ6Hb5S.js","./assets/createLucideIcon-Cml3-wEV.js","./assets/es-CEbGEA7n.js","./assets/index-BCbKmNgS.css","./assets/index-DfvyIOPL.js","./assets/influence.worker-CMvCtPEs.js","./assets/jsx-runtime-CaR_m4Xc.js","./assets/migrate-BptNUrTT.js","./assets/motionFeatures-DpvMnlEE.js","./assets/pDelta-DhYm1ucn.js","./assets/pdf-D9bZd1dk.js","./assets/pdf.worker-BASQQs-o.mjs","./assets/pdf.worker-BNprRpH7.js","./assets/plus-D3Bmohfz.js","./assets/portable-ldATVLy7.js","./assets/portableExportAnalysis-C57uTVab.js","./assets/portableFile-ZSpT83Q3.js","./assets/projectCommand-BS41F-9g.js","./assets/projectRepository-C_13d7xN.js","./assets/reliability-BCrQkPo9.js","./assets/rolldown-runtime-CNC7AqOf.js","./assets/rotate-ccw-Buo9FQbH.js","./assets/scenarios.worker-C6G_IK27.js","./assets/shield-check-BzmKnplT.js","./assets/structureGeometry-jm23YW2U.js","./assets/triangle-alert-D_MQgJqe.js","./assets/usePhase2I18n-JU-2EtCC.js","./assets/workerHandlers-QC5pt_iZ.js","./favicon.svg","./fonts/ibm-plex-mono-400.woff2","./fonts/ibm-plex-mono-500.woff2","./fonts/ibm-plex-sans-400.woff2","./fonts/ibm-plex-sans-500.woff2","./fonts/ibm-plex-sans-600.woff2","./fonts/ibm-plex-sans-700.woff2","./icons.svg","./index.html","./site.webmanifest"];
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