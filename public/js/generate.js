import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

async function passwordGenerate () {
  const resp = await JH.http('/api/generatepassword')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value('#generatedpassword', body.data.password)
  }
}

await passwordGenerate()
JH.event('#generate', 'click', async (ev) => {
  await passwordGenerate()
})
