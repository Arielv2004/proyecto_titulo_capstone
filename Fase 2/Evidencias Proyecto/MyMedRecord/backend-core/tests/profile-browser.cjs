const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

module.exports = async ({ base, db, patient, token }) => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH);
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('mymedrecord_cookie_consent', 'essential_only'));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const shots = process.env.PROFILE_SCREENSHOT_DIR || path.join(os.tmpdir(), 'mymedrecord-profile-qa');
  await fs.mkdir(shots, { recursive: true });
  let puts = 0, failNext = false, releaseSave, holdSave = false, failLoad = false;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/api/v1/**', async route => {
    const req = route.request();
    if (req.url().includes('/patient-profile/me') && req.method() === 'GET' && failLoad) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Error de prueba' }) });
    }
    if (req.url().includes('/patient-profile/me') && req.method() === 'PUT') {
      puts++;
      if (holdSave) await new Promise(resolve => { releaseSave = resolve; });
      if (failNext) {
        failNext = false;
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Error de prueba' }) });
      }
    }
    const response = await route.fetch({ url: base + req.url().split('/api/v1')[1], headers: { ...req.headers(), authorization: 'Bearer ' + token } });
    await route.fulfill({ response });
  });
  try {
    await db.query("UPDATE patient_profiles SET biological_sex=NULL, gender='MASCULINO', gender_other=NULL, blood_type='O+', health_insurance='FONASA Tramo A' WHERE user_id=$1", [patient.id]);
    await page.goto('http://localhost:5173/patient');
    const editor = page.getByRole('dialog', { name: 'Editar perfil de salud' });
    await editor.waitFor();
    assert.equal(await editor.getByLabel(/Sexo biológico/).inputValue(), '');
    assert.equal(await editor.getByRole('combobox', { name: /^Género/ }).inputValue(), 'MASCULINO');
    await page.screenshot({ path: path.join(shots, '01-inicial-desktop.png') });
    await editor.getByRole('button', { name: 'Completar después' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Completar perfil', exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Completar perfil', exact: true }).click();
    await editor.getByRole('button', { name: 'Guardar Cambios en Mi Perfil' }).click();
    assert.equal(puts, 0);
    assert.equal(await page.getByRole('dialog', { name: 'Confirmar cambios del perfil' }).count(), 0);
    await editor.getByLabel(/Sexo biológico/).selectOption('FEMENINO');
    await editor.getByRole('combobox', { name: /^Género/ }).selectOption('OTRA_IDENTIDAD');
    await editor.getByLabel('Especifica tu identidad de género').fill('   ');
    await editor.getByRole('button', { name: 'Guardar Cambios en Mi Perfil' }).click();
    await editor.getByText('Especifica tu identidad de género con entre 1 y 80 caracteres.').waitFor();
    await editor.getByLabel('Especifica tu identidad de género').fill(' Identidad de prueba ');
    await editor.getByRole('button', { name: 'Guardar Cambios en Mi Perfil' }).click();
    const confirm = page.getByRole('dialog', { name: 'Confirmar cambios del perfil' });
    await confirm.waitFor();
    assert.equal(puts, 0);
    await page.keyboard.press('Tab');
    assert.ok(await confirm.getByRole('button', { name: 'Volver a editar' }).evaluate(el => el === document.activeElement));
    await page.keyboard.press('Escape');
    await editor.waitFor();
    assert.equal(await editor.getByLabel('Especifica tu identidad de género').inputValue(), ' Identidad de prueba ');
    assert.equal(puts, 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(shots, '02-edicion-mobile-dark.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await editor.getByRole('button', { name: 'Guardar Cambios en Mi Perfil' }).click();
    await confirm.waitFor();
    await page.screenshot({ path: path.join(shots, '03-confirmacion-mobile-dark.png') });
    failNext = true; holdSave = true;
    await confirm.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await confirm.getByRole('button', { name: 'Guardando…' }).waitFor();
    assert.ok(await confirm.getByRole('button', { name: 'Volver a editar' }).isDisabled());
    assert.ok(await confirm.getByRole('button', { name: 'Guardando…' }).isDisabled());
    await page.keyboard.press('Escape');
    assert.ok(await confirm.isVisible());
    const deadline = Date.now() + 5000;
    while (!releaseSave && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(releaseSave, 'La solicitud de guardado llegó al servidor');
    releaseSave(); holdSave = false;
    await editor.getByText('No pudimos guardar los cambios. Conservamos lo que ingresaste para que puedas intentarlo otra vez.').waitFor();
    assert.equal(puts, 1);
    assert.equal(await editor.getByLabel('Especifica tu identidad de género').inputValue(), ' Identidad de prueba ');
    await editor.getByRole('button', { name: 'Guardar Cambios en Mi Perfil' }).click();
    await confirm.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await confirm.waitFor({ state: 'hidden' });
    assert.equal(puts, 2);
    let saved = (await db.query('SELECT biological_sex,gender,gender_other FROM patient_profiles WHERE user_id=$1', [patient.id])).rows[0];
    assert.deepEqual(saved, { biological_sex: 'FEMENINO', gender: 'OTRA_IDENTIDAD', gender_other: 'Identidad de prueba' });
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Mi perfil', exact: true }).click();
    await page.getByText('Otra identidad: Identidad de prueba', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(shots, '04-perfil-desktop.png') });
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    await editor.getByRole('combobox', { name: /^Género/ }).selectOption('');
    assert.equal(await editor.getByLabel('Especifica tu identidad de género').count(), 0);
    await editor.getByRole('button', { name: 'Guardar Cambios en Mi Perfil' }).click();
    await confirm.getByRole('button', { name: 'Confirmar y guardar' }).click();
    await confirm.waitFor({ state: 'hidden' });
    saved = (await db.query('SELECT gender,gender_other FROM patient_profiles WHERE user_id=$1', [patient.id])).rows[0];
    assert.deepEqual(saved, { gender: null, gender_other: null });
    // A failed profile load must never open an empty onboarding form.
    await page.evaluate(() => sessionStorage.removeItem('mymedrecord_profile_prompt'));
    failLoad = true;
    await page.reload();
    await page.getByRole('button', { name: 'Mi perfil', exact: true }).click();
    await page.getByText('No pudimos cargar tu perfil', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Browser QA screenshots:', shots);
  } catch (error) {
    await page.screenshot({ path: path.join(shots, 'failure.png') });
    throw error;
  } finally { await context.close(); await browser.close(); }
};
