const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
  const p = await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36');
  const reqs = [];
  p.on('request', r => { const u=r.url(); if(/mcp|claude|api\./i.test(u)) reqs.push(r.method()+' '+u); });
  await p.goto('https://www.eromify.com/mcp', {waitUntil:'networkidle2', timeout:60000});
  await new Promise(r=>setTimeout(r,3500));
  const data = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const codes = Array.from(document.querySelectorAll('code,pre')).map(e=>e.innerText);
    const links = Array.from(document.querySelectorAll('a[href]')).map(a=>a.getAttribute('href'));
    return {title: document.title, url: location.href, text, codes, links};
  });
  const fs = require('fs');
  fs.writeFileSync('../_eromify_mcp_render.json', JSON.stringify({...data, mcpRequests: reqs}, null, 2));
  console.log('TITLE:', data.title);
  console.log('FINAL URL:', data.url);
  console.log('TEXT LENGTH:', data.text.length);
  console.log('CODE BLOCKS:', data.codes.length);
  console.log('MCP/CLAUDE REQUESTS:', reqs.length);
  await b.close();
})().catch(e=>{console.error('ERR', e.message); process.exit(1);});
