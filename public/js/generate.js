/* global jhEvent, jhValue, jhFetch */

import * as PW from './passweaver-gui.js'

async function passwordGenerate () {
  const resp = await jhFetch('/api/generatepassword')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    jhValue('#generatedpassword', body.data.password)
  }
}

await passwordGenerate()
jhEvent('#generate', 'click', async (ev) => {
  await passwordGenerate()
})
