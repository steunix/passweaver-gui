import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

const domCache = {
  passwordInput: JH.query('#generatedpassword'),
  noSymPasswordInput: JH.query('#generatedpasswordns'),
  generateButton: JH.query('#generate'),
  noSymGenerateButton: JH.query('#generatens'),
  onetimeCreate: JH.query('#onetime'),
  noSymOnetimeCreate: JH.query('#onetimens'),
  generatedPasswordInput: JH.query('#generatedpassword'),
  noSymGeneratedPasswordInput: JH.query('#generatedpasswordns')
}

async function passwordGenerate () {
  JH.value(domCache.passwordInput, 'Generating...')
  const resp = await JH.http('/api/generatepassword')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value(domCache.passwordInput, body.data.password)
  }
}

async function passwordGenerateNoSymbols () {
  JH.value(domCache.noSymPasswordInput, 'Generating...')
  const resp = await JH.http('/api/generatepassword?symbols=false')
  if (!await PW.checkResponse(resp)) {
    return
  }

  const body = await resp.json()
  if (body.status === 'success') {
    JH.value(domCache.noSymPasswordInput, body.data.password)
  }
}

function tokenGenerate (data) {
  window.location = `/pages/onetimesecret?data=${encodeURIComponent(data)}`
}

await passwordGenerate()
await passwordGenerateNoSymbols()

JH.event(domCache.generateButton, 'click', async (ev) => {
  await passwordGenerate()
})

JH.event(domCache.noSymGenerateButton, 'click', async (ev) => {
  await passwordGenerateNoSymbols()
})

JH.event(domCache.onetimeCreate, 'click', async (ev) => {
  tokenGenerate(JH.value(domCache.generatedPasswordInput))
})

JH.event(domCache.noSymOnetimeCreate, 'click', async (ev) => {
  tokenGenerate(JH.value(domCache.noSymGeneratedPasswordInput))
})
