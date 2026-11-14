/* Build-time helper only. sharp is supplied by the development host, never shipped at runtime. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.join(__dirname, '..');
const directory = path.join(root, 'assets', 'symbols');
const revision = '28e2a3602e4bde033a1dd388e86e9c117b425e34';
const expectedBlobs = {"airport.svg":"3095aacf260cffdc236c00213ecb164713c991a0","bakery.svg":"2a00e88c21fcfc7ef4269045a884ed59a65d3e0c","bank.svg":"592f5fd0f13c0449fdcd3a9d13d693afdee35db1","beach.svg":"5e08cd2c5f1c9a11ceceb5b92e87ce84feb322b8","bus.svg":"6602f1661ad0a00679c5c394fe398bd336bbb770","cafe.svg":"acfc9ed7610c922dac441791c04108126ed31540","car-repair.svg":"6a6fdf05e638b7bf904c6d95edd41298a19c2d89","car.svg":"5b114987e454e0ca6030853604709c316b324df8","cemetery.svg":"43d34afa0adea780aa1ee2826096c3683c16f0de","cinema.svg":"b3d34710681c34acf5f1c16edae4c88fc19572f7","clothing-store.svg":"3de5fc0e2557ca62d9fc77321483707de07f1d6b","college.svg":"6809f7defb8e396e1d96b4c867a0e95a61ac985b","commercial.svg":"a1e68951a24a67498e43a7d8396d11b4f97d8dfd","communications-tower.svg":"97377ec7197fd0984bd4929e28d62e37bfa52bba","construction.svg":"396c84e43c2efff44cb43f86c54bfa66ad10dd47","doctor.svg":"80b86891f88e76b897dbc401509639915be3639d","embassy.svg":"d1fb83f89e04541db677ce3bb366f79768918405","farm.svg":"e4cab89d68c7077deec73e816d65b05dd00342a3","fast-food.svg":"08e020a5d2cb011fb3eb61dab50f9119ce6ed35c","fire-station.svg":"17dfe9fd7f95403b5d6157fa98357be036204d8f","fitness-centre.svg":"6e734d0fd126ddfd7d52ad99771904819adeafb3","fuel.svg":"fcb783d688a83b6ec2c7507c2fa3c4aa7c5a80f7","grocery.svg":"8bf2ecdbb86b6516ef7ba67a5e6c0869a1101c18","hairdresser.svg":"82f5981257e0356671f29a88e1f7099533aaee89","harbor.svg":"b057f678525d28fb5e29009d9c1ece2fb9ca70fd","home.svg":"5a85cd4f96ef0989af79fac42c7082755b1669f0","hospital.svg":"ae7cae000ed0b22999f39d3ad117878b0db28495","industry.svg":"c2c8d830d486e0db88a6d3ea6b1921fa5d242f80","information.svg":"487bc92bef3f82f06f24373dffcefe1800cba257","library.svg":"18d529a12a57bb234b1d15369fc9b8e7f3ea5a8c","lodging.svg":"d1bde6b04f6ba97449bd014b84ce678e88343235","marker.svg":"2247dcde7d9ac9cc31c90a75d033e1ecb0c62334","mobile-phone.svg":"b22778bd63436cd65db3ea7ac0c6c17a60d58c89","mountain.svg":"d48d2449fb16bb81b97397f6431f8eab2cf16ee7","museum.svg":"1c1596d3bfd430398bb4c2151d9f36e85b5f5311","natural.svg":"3b5778b80c294a221c0bec50aff0443497b1996b","park.svg":"10355295690cc3075f1d8ab8d6149ea6677f3c94","parking.svg":"5a269d777f21901736f4a8be2dbb5218da8c06c5","pharmacy.svg":"c4de245ae85418bb93760674a3caca6f0acb8ead","place-of-worship.svg":"0ff8fd4d5fee9431ccb29e1851dbf006d1eb00a3","playground.svg":"d2670ed9db8886b7e8f47ec293dddf93f50b7187","police.svg":"3c32c2acef129b9cb0ccd6ed7c0fb94dcd7d7bd0","post.svg":"1c55253a09c477dc136e1472485d36c1a461eaca","rail.svg":"d79333d9ca5af2a1436ce3eb86b9f27a369eea3e","recycling.svg":"23a77049c19e698311eb2f0a9038920d075a3474","religious-buddhist.svg":"c3e4b9a0dabd71a7b65382164f6d767567ff8111","religious-christian.svg":"9f7bc2f7e1b9d38f610e3b3a928475c1a52a884f","religious-jewish.svg":"022c93e57d72361da00b931644b36809aed4e90c","religious-muslim.svg":"9da54b690807166ab2caf62f850f45d4adac1637","restaurant.svg":"56882d03972086bc7a0cd717157d94299a139c3d","school.svg":"f54ef766ce2a9eff7b07d14ae7ca666d050886e0","shop.svg":"df8e8dc31090c0618dda2ef0b86ab16da5c5e7ce","stadium.svg":"cbcc6167d33e6f0267a4b2764de9f15c5f74ef1d","swimming.svg":"e78fb7a825fef39e113503fea3f54ac7a184b212","taxi.svg":"7b5b2f45227640065243417751ca9434fc3fd6b5","theatre.svg":"87c9763246b743e04723ca9bf83f583af996f314","toilet.svg":"00821ff35106a5e7bb8b28979d7d15aabca04f83","town-hall.svg":"7825b1e0cc484e8c02730caaac16b6ab587661ce","warehouse.svg":"165fce66f842524d35056e27dc8d73a9ded3c575","water.svg":"8fca8934a513c23d4382d78e0ab33d839ae14908"};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const files = fs.readdirSync(directory).filter(name => name.endsWith('.svg')).sort();
  const resources = [];
  for (const name of files) {
    let svg = fs.readFileSync(path.join(directory, name));
    const blobHash = bytes => crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    // Text transfer can add a final newline. Restore only a variant proven by Git's pinned blob ID.
    const verified = [svg, Buffer.from(svg.toString().trimEnd()), Buffer.from(svg.toString().trimEnd() + '\n')].find(bytes => blobHash(bytes) === expectedBlobs[name]);
    if (!verified) throw new Error('Source bytes do not match the pinned Maki Git blob: ' + name);
    svg = verified; fs.writeFileSync(path.join(directory, name), svg);
    const gitBlob = blobHash(svg);
    if (/<(?:script|foreignObject|image)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(svg.toString())) {
      throw new Error('Unsafe SVG asset: ' + name);
    }
    const inner = svg.toString().replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');
    const image = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="23" fill="#ffffff" stroke="#1e3a5f" stroke-width="2"/><g transform="translate(9 9) scale(2)" fill="#102a43">${inner}</g></svg>`;
    const png = await sharp(Buffer.from(image)).png().toBuffer();
    fs.writeFileSync(path.join(directory, name.replace('.svg', '.png')), png);
    resources.push({ glyph: name.slice(0, -4), source: `https://raw.githubusercontent.com/mapbox/maki/${revision}/icons/${name}`, upstreamGitBlob: gitBlob, svg: { path: `assets/symbols/${name}`, bytes: svg.length, sha256: hash(svg) }, png: { path: `assets/symbols/${name.replace('.svg', '.png')}`, bytes: png.length, sha256: hash(png) } });
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ name: '@mapbox/maki', version: '8.2.0', revision, license: 'CC0-1.0', renderer: `sharp ${sharp.versions.sharp}`, resources }, null, 2) + '\n');
  console.log(JSON.stringify({ icons: resources.length, totalBytes: resources.reduce((n, r) => n + r.svg.bytes + r.png.bytes, 0) }));
})().catch(error => { console.error(error); process.exitCode = 1; });
