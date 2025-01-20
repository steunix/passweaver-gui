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

async function passwordGenerateNoSymbols () {
  const resp = await JH.http('/api/generatepassword?symbols=false')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value('#generatedpasswordns', body.data.password)
  }
}

function tokenGenerate (data) {
  window.location = `/pages/onetimesecret?data=${encodeURIComponent(data)}`
}

await passwordGenerate()
await passwordGenerateNoSymbols()

JH.event('#generate', 'click', async (ev) => {
  await passwordGenerate()
})

JH.event('#generatens', 'click', async (ev) => {
  await passwordGenerateNoSymbols()
})

JH.event('#onetime', 'click', async (ev) => {
  tokenGenerate(JH.value('#generatedpassword'))
})

JH.event('#onetimens', 'click', async (ev) => {
  tokenGenerate(JH.value('#generatedpasswordns'))
})
