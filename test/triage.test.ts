import triagePullRequest from '../src/actions/triage'
import LABELS from '../src/actions/labels.json'

import pr9135OpenedEvent from './fixtures/triage/pr9135.opened.json'
import pr9135ModifiedFiles from './fixtures/triage/pr9135ModifiedFiles.json'
import pr9102SynchronizeEvent from './fixtures/triage/pr9102.synchronize.json'
import pr9102ModifiedFiles from './fixtures/triage/pr9102ModifiedFiles.json'

import { Probot, Application } from 'probot'
import nock from 'nock'

// Only test the triage action
const probotApp = (app: Application) => {
  app.on(['pull_request.opened', 'pull_request.synchronize'], triagePullRequest)
}

describe('triage Pull Request', () => {
  const probot = new Probot({
    id: 1,
    githubToken: 'test',
    throttleOptions: { enabled: false }
  })
  probot.load(probotApp)

  const githubScope = nock('https://api.github.com')
  nock.disableNetConnect()

  afterEach(() => {
    expect(githubScope.isDone()).toBe(true)
    nock.cleanAll()
  })

  test('correctly labels a pull request when it is opened', async () => {
    const expectedLabels = [
      LABELS.ALIAS,
      LABELS.PLUGIN
    ]

    // Mock PR listFiles
    githubScope
      .get('/repos/ohmyzsh/ohmyzsh/pulls/9135/files')
      .reply(200, pr9135ModifiedFiles)

    // Mock plugin getContents
    githubScope
      .head('/repos/ohmyzsh/ohmyzsh/contents/plugins/laravel')
      .reply(200)

    // Mock PR replaceLabels
    githubScope
      .put('/repos/ohmyzsh/ohmyzsh/issues/9135/labels', (body: any) => {
        expect(body.sort()).toMatchObject(expectedLabels.sort())
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ id: 'event-id', name: 'pull_request', payload: pr9135OpenedEvent })
  })

  test('correctly labels a pull request when it is synchronized', async () => {
    // Mock PR listFiles
    githubScope
      .get('/repos/ohmyzsh/ohmyzsh/pulls/9102/files')
      .reply(200, pr9102ModifiedFiles)

    // Mock plugin getContents
    githubScope
      .head('/repos/ohmyzsh/ohmyzsh/contents/plugins/dotenv')
      .reply(200)

    // We don't need to mock anything else, labels shouldn't be changed

    // Receive a webhook event
    await probot.receive({ id: 'event-id', name: 'pull_request', payload: pr9102SynchronizeEvent })
  })
})
