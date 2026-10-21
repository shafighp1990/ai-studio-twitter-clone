import assert from 'node:assert/strict';
import { submitPasswordChange } from '../lib/auth/password-change.ts';
const originalFetch = globalThis.fetch;
try {
  for (const redirect of ['/', '/admin']) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/auth/change-password');
      assert.equal(options.credentials, 'same-origin');
      assert.deepEqual(JSON.parse(options.body), {currentPassword:'temporary-test-password',newPassword:'new-test-password-123'});
      return Response.json({data:{redirect},error:null});
    };
    assert.equal(await submitPasswordChange('temporary-test-password','new-test-password-123'),redirect);
  }
  const cases = [
    [new Response('<html>Upstream failure</html>', {status:502}), /کد 502/],
    [new Response('', {status:200}), /کد 200/],
    [Response.json({error:{message:'Current password is incorrect'}},{status:403}), /رمز فعلی درست نیست/],
    [Response.json({error:{message:'Sign in required'}},{status:401}), /نشست ورود/],
    [Response.json({error:{message:'Rate limit'}},{status:429}), /پنج دقیقه/],
    [Response.json(null), /پاسخ ذخیرهٔ رمز کامل نبود/],
    [Response.json({data:{redirect:'https://example.invalid'}}), /پاسخ ذخیرهٔ رمز کامل نبود/],
  ];
  for (const [response, error] of cases) {
    globalThis.fetch = async () => response;
    await assert.rejects(submitPasswordChange('test-current','test-next'),error);
  }
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(submitPasswordChange('test-current','test-next'),/ارتباط با سایت/);
  console.log('PASS: both success destinations, request payload, HTML/empty/malformed responses, expired sessions, wrong password, rate limit, unsafe redirect, network failure.');
} finally { globalThis.fetch = originalFetch; }
