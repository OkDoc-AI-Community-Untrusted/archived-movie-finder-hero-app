import fs from 'fs';
fetch('https://raw.githubusercontent.com/okDoc-ai/plugin-sdk/master/DOCS/IframePluginGuide.md')
  .then(r => r.text())
  .then(t => fs.writeFileSync('IframePluginGuide.md', t));
