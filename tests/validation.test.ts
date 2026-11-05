import test from 'node:test';
import assert from 'node:assert/strict';
import { complaintSchema, rowSchema, safeLink } from '../lib/validation.ts';
import { seed } from '../lib/seed.ts';
test('complaints validate both languages and reject spam/oversized payloads', () => { const good = { full_name: 'Nom exemple', email: 'test@example.org', message: 'Une réclamation valide.', locale: 'fr', website: '' }; assert.equal(complaintSchema.safeParse(good).success, true); assert.equal(complaintSchema.safeParse({ ...good, locale: 'ar' }).success, true); for (const patch of [{ website: 'spam' }, { message: 'court' }, { email: 'invalid' }, { full_name: 'a' }, { message: 'a'.repeat(5001) }])
    assert.equal(complaintSchema.safeParse({ ...good, ...patch }).success, false); });
test('editor rejects executable links and arbitrary fonts', () => { for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', 'http://insecure.example'])
    assert.equal(safeLink.safeParse(value).success, false); assert.equal(safeLink.safeParse('https://wa.me/212661675387').success, true); const row = { key: 'service', label_fr: 'Test', label_ar: 'اختبار', sort_order: 0, is_active: false, data: {} }; assert.equal(rowSchema.safeParse({ ...row, data: { href: 'javascript:alert(1)' } }).success, false); assert.equal(rowSchema.safeParse({ ...row, data: { font: 'unsafe' } }).success, false); });
test('seed is fully bilingual and excludes unconfirmed network records', () => { assert.equal(seed.cities.length, 0); assert.equal(seed.transport_lines.length, 0); assert.equal(seed.agencies.length, 0); assert.equal(seed.hero_slides.length, 3); assert.equal(seed.services.length, 5); for (const rows of Object.values(seed))
    for (const row of rows) {
        assert.ok(row.label_fr);
        assert.ok(row.label_ar);
        const { id: _, ...value } = row;
        void _;
        assert.equal(rowSchema.safeParse(value).success, true, `${row.key} seed`);
    } assert.equal(seed.site_settings[0].data.instagram, ''); assert.equal(seed.site_settings[0].data.studio_url, ''); });

test('network references validate UUIDs and local Storage media is restricted to loopback',()=>{
 const row={key:'line',label_fr:'Test',label_ar:'Test',sort_order:0,is_active:false,data:{agency_ids:['11111111-1111-4111-8111-111111111111']},origin_city_id:'22222222-2222-4222-8222-222222222222'};
 assert.equal(rowSchema.safeParse(row).success,true);
 assert.equal(rowSchema.safeParse({...row,origin_city_id:'invalid'}).success,false);
 assert.equal(rowSchema.safeParse({...row,data:{agency_ids:['invalid']}}).success,false);
 assert.equal(rowSchema.safeParse({...row,data:{image:'http://127.0.0.1:54321/storage/v1/object/public/slkm-media/uploads/test.webp'}}).success,true);
 assert.equal(rowSchema.safeParse({...row,data:{image:'http://remote.invalid/storage/v1/object/public/slkm-media/test.webp'}}).success,false);
});
