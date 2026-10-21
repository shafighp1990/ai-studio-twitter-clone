const path = require('node:path'), fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
const repo = process.cwd();
const esbuild = require(path.join(repo, 'node_modules/esbuild'));
// Uses simulated media and an in-memory signaling service; no user accounts or cameras.
// Set PLAYWRIGHT_MODULE and CHROME_EXECUTABLE to use an existing browser-test runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const temp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'meeting-camera-'));
const bundle = path.join(temp, 'bundle.js');
(async () => {
    await esbuild.build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import MeetingRoom from './components/MeetingRoom';createRoot(document.getElementById('root')).render(<MeetingRoom room={{id:'test-room',title:'Camera test',ended:false}} host={true} initialName="Test"/>);`, resolveDir: repo, loader: 'tsx' }, bundle: true, jsx: 'automatic', outfile: bundle, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'test-context', setup(build) { build.onResolve({ filter: /^(next\/link|\.\/I18nProvider|\.\/LanguageSwitcher)$/ }, args => ({ path: args.path, namespace: 'stub' })); build.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path === 'next/link' ? 'export default function Link({children}){return children}' : args.path.includes('I18n') ? 'export function useI18n(){return {locale:"fa"}}' : 'export default function LanguageSwitcher(){return null}', loader: 'js' })); build.onResolve({ filter: /^@\// }, args => ({ path: path.join(repo, args.path.replace('@/', '') + '.ts') })); } }] });
    const server = http.createServer((req, res) => { if (req.url === '/bundle.js') {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(fs.readFileSync(bundle));
    }
    else {
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
    } });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const site = `http://127.0.0.1:${server.address().port}`;
    let browser;
    const members = new Set(), signals = [];
    let seq = 0;
    try {
        browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE, args: ['--autoplay-policy=no-user-gesture-required'] });
        async function createPage(id) {
            const context = await browser.newContext();
            await context.addInitScript(() => {
                const state = window.__cameraTest = { streams: [], fail: false, hold: false, release: null, failReplace: false };
                const originalReplace = RTCRtpSender.prototype.replaceTrack;
                RTCRtpSender.prototype.replaceTrack = function (track) { if (state.failReplace) {
                    state.failReplace = false;
                    return Promise.reject(new Error('Synthetic replace failure'));
                } return originalReplace.call(this, track); };
                Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => [{ kind: 'videoinput', deviceId: 'phone', label: 'iPhone Camera', groupId: 'phone' }, { kind: 'videoinput', deviceId: 'laptop', label: 'FaceTime HD Camera (Built-in)', groupId: 'laptop' }] });
                Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints) => {
                        if (state.fail) {
                            state.fail = false;
                            throw new DOMException('Synthetic missing camera', 'NotFoundError');
                        }
                        if (state.hold) {
                            state.hold = false;
                            await new Promise(resolve => state.release = resolve);
                        }
                        const id = constraints.video?.deviceId?.exact || 'phone';
                        const canvas = document.createElement('canvas');
                        canvas.width = 320;
                        canvas.height = 240;
                        const ctx = canvas.getContext('2d');
                        const draw = () => { ctx.fillStyle = id === 'laptop' ? '#00ff00' : '#ff0000'; ctx.fillRect(0, 0, 320, 240); };
                        draw();
                        setInterval(draw, 50);
                        const stream = canvas.captureStream(20);
                        const video = stream.getVideoTracks()[0];
                        const original = video.getSettings.bind(video);
                        video.getSettings = () => ({ ...original(), deviceId: id });
                        if (constraints.audio) {
                            const ac = new AudioContext();
                            const oscillator = ac.createOscillator(), gain = ac.createGain(), destination = ac.createMediaStreamDestination();
                            gain.gain.value = 0;
                            oscillator.connect(gain).connect(destination);
                            oscillator.start();
                            stream.addTrack(destination.stream.getAudioTracks()[0]);
                        }
                        state.streams.push(stream);
                        return stream;
                    } });
            });
            const page = await context.newPage();
            await page.route('**/api/meetings/test-room**', async (route) => { const request = route.request(); let result = {}; if (request.method() === 'POST') {
                const b = request.postDataJSON();
                if (b.action === 'join') {
                    members.add(id);
                    result = { participantId: id, iceServers: [] };
                }
                else if (b.action === 'signal') {
                    signals.push({ id: ++seq, sender: id, to: b.to, payload: b.payload });
                }
                else if (b.action === 'leave') {
                    members.delete(id);
                }
            }
            else {
                const after = Number(new URL(request.url()).searchParams.get('after') || 0);
                result = { peers: [...members].map(id => ({ id, name: id, isHost: 0 })), signals: signals.filter(s => s.to === id && s.id > after) };
            } await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) }); });
            await page.goto(site);
            await page.getByRole('button', { name: 'ورود به جلسه', exact: true }).click();
            await page.getByRole('combobox', { name: 'انتخاب دوربین' }).waitFor();
            return page;
        }
        const host = await createPage('alice'), guest = await createPage('bob');
        async function color(page, channel) { await page.waitForFunction(channel => { const video = document.querySelectorAll('video')[1]; if (!video || video.readyState < 2)
            return false; const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1; const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0, 1, 1); return ctx.getImageData(0, 0, 1, 1).data[channel] > 200; }, channel, { timeout: 30000 }); }
        await color(guest, 0);
        const mic = await host.locator('video').first().evaluate(v => v.srcObject.getAudioTracks()[0].id);
        const select = host.getByRole('combobox', { name: 'انتخاب دوربین' });
        await host.evaluate(() => window.__cameraTest.fail = true);
        await select.selectOption('laptop');
        await host.getByRole('alert').filter({ hasText: 'در دسترس نیست' }).waitFor();
        assert.equal(await select.inputValue(), 'phone');
        await host.evaluate(() => window.__cameraTest.failReplace = true);
        await select.selectOption('laptop');
        await host.getByRole('alert').filter({ hasText: 'در دسترس نیست' }).waitFor();
        assert.equal(await select.inputValue(), 'phone');
        await color(guest, 0);
        await select.selectOption('laptop');
        await host.waitForFunction(() => document.querySelector('select').value === 'laptop');
        await color(guest, 1);
        assert.equal(await host.locator('video').first().evaluate(v => v.srcObject.getAudioTracks()[0].id), mic);
        assert.equal(await host.evaluate(() => window.__cameraTest.streams[0].getVideoTracks()[0].readyState), 'ended');
        await host.getByRole('button', { name: '● دوربین', exact: true }).click();
        await select.selectOption('phone');
        await host.waitForFunction(() => document.querySelector('select').value === 'phone');
        assert.equal(await host.locator('video').first().evaluate(v => v.srcObject.getVideoTracks()[0].enabled), false);
        await host.evaluate(() => window.__cameraTest.hold = true);
        await select.selectOption('laptop');
        await host.getByRole('button', { name: 'خروج', exact: true }).click();
        await host.evaluate(() => window.__cameraTest.release());
        await host.waitForFunction(() => window.__cameraTest.streams.every(s => s.getTracks().every(t => t.readyState === 'ended')));
        console.log('PASS: two real WebRTC peers; phone-to-laptop video reaches remote peer; microphone preserved; failed acquisition and sender replacement keep old camera; camera-off preserved; leaving during acquisition stops every track.');
    }
    finally {
        if (browser)
            await browser.close();
        await new Promise(r => server.close(r));
        fs.rmSync(temp, { recursive: true, force: true });
    }
})().catch(e => { console.error(e.stack); process.exit(1); });
